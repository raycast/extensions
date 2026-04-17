import { Detail, ActionPanel, Action, showToast, Toast, popToRoot, open, Icon, Color } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { accessSync, constants } from "node:fs";
import { addRenderToHistory, updateRenderInHistory, formatDuration, RenderHistory } from "./utils/render-history";
import { getCompletionMessage } from "./utils/ae-detector";

interface RenderProgressProps {
  aerenderPath: string;
  projectPath: string;
}

export default function RenderProgress({ aerenderPath, projectPath }: RenderProgressProps) {
  const [currentFrame, setCurrentFrame] = useState<string>("Initializing...");
  const [currentComp, setCurrentComp] = useState<string>("");
  const [status, setStatus] = useState<"starting" | "rendering" | "completed" | "failed">("starting");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [totalFrames, setTotalFrames] = useState<number | null>(null);
  const [renderId] = useState(() => Date.now().toString());

  // Use refs to track current values (avoid closure issues)
  const hasRenderedFramesRef = useRef(false);
  const outputRef = useRef<string[]>([]);
  const renderProcessRef = useRef<ReturnType<typeof spawn> | null>(null);
  const manuallyStoppedRef = useRef(false);

  const stopRender = async () => {
    if (renderProcessRef.current) {
      manuallyStoppedRef.current = true;

      try {
        renderProcessRef.current.kill();
      } catch (error) {
        console.log("Process already exited:", error);
      }

      setStatus("failed");
      setCurrentFrame("Render stopped by user");

      await updateRenderInHistory(renderId, {
        endTime: new Date(),
        duration: elapsedTime,
        status: "failed",
        error: "Stopped by user",
        pid: undefined,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Render Stopped",
        message: "The render has been cancelled.",
      });
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    let renderProcess: ReturnType<typeof spawn> | undefined;
    const startTime = Date.now();

    try {
      accessSync(aerenderPath, constants.X_OK);
    } catch {
      const errorMsg = `ERROR: aerender not found or not executable at:\n${aerenderPath}\n\nPlease check your After Effects installation.`;
      setOutput([errorMsg]);
      outputRef.current = [errorMsg];
      setStatus("failed");
      setCurrentFrame("Failed to start");

      showToast({
        style: Toast.Style.Failure,
        title: "AERender Not Found",
        message: "The aerender executable could not be found or is not executable",
      });
      return;
    }

    // eslint-disable-next-line prefer-const
    renderProcess = spawn(aerenderPath, ["-project", projectPath, "-sound", "OFF"]);
    renderProcessRef.current = renderProcess;

    const commandStr = `"${aerenderPath}" -project "${projectPath}" -sound OFF`;
    console.log("Running command:", commandStr);

    const initialOutput = [`Running: ${commandStr}\n`];
    setOutput(initialOutput);
    outputRef.current = initialOutput;
    setCurrentFrame("Starting After Effects render engine...");

    const initialHistory: RenderHistory = {
      id: renderId,
      projectPath,
      aeVersion: aerenderPath,
      startTime: new Date(),
      status: "running",
      pid: renderProcess.pid,
    };
    addRenderToHistory(initialHistory);

    // eslint-disable-next-line prefer-const
    interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    renderProcess.on("error", (err) => {
      setOutput((prev) => {
        const updated = [...prev, `\nERROR: Failed to start aerender process\n${err.message}\n`];
        outputRef.current = updated;
        return updated;
      });
      setStatus("failed");
    });

    renderProcess.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      setOutput((prev) => {
        const updated = [...prev, text];
        outputRef.current = updated;
        return updated;
      });

      setStatus("rendering");

      const frameMatch = text.match(/PROGRESS:.*\((\d+)\)/);
      if (frameMatch) {
        const frame = parseInt(frameMatch[1]);
        setCurrentFrame(`Frame ${frame}`);
        hasRenderedFramesRef.current = true;
      }

      const compMatch = text.match(/Rendering\s+(.+?)\./);
      if (compMatch) {
        setCurrentComp(compMatch[1]);
      }

      const totalMatch = text.match(/(\d+)\s+of\s+(\d+)\s+frames/i);
      if (totalMatch) {
        setTotalFrames(parseInt(totalMatch[2]));
      }

      if (text.includes("Total Time Elapsed") || text.includes("Finished composition")) {
        hasRenderedFramesRef.current = true;
      }
    });

    // Capture stderr (aerender outputs info here too, not just errors)
    renderProcess.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      setOutput((prev) => {
        const updated = [...prev, text];
        outputRef.current = updated;
        return updated;
      });

      // Check if this is actual error output or just informational
      const lowerText = text.toLowerCase();
      const isActualError =
        lowerText.includes("error:") ||
        lowerText.includes("fatal:") ||
        lowerText.includes("exception:") ||
        (lowerText.includes("failed") && !lowerText.includes("progress"));

      // Only set to rendering if this isn't a critical error
      if (!isActualError) {
        setStatus("rendering");
      }

      // Also parse stderr for useful info (frame number in parentheses)
      const frameMatch = text.match(/PROGRESS:.*\((\d+)\)/);
      if (frameMatch) {
        const frame = parseInt(frameMatch[1]);
        setCurrentFrame(`Frame ${frame}`);
        hasRenderedFramesRef.current = true;
      }
    });

    // Handle completion
    renderProcess.on("close", async (code) => {
      clearInterval(interval);
      const duration = Math.floor((Date.now() - startTime) / 1000);

      // If manually stopped, don't process as completion - already handled by stopRender()
      if (manuallyStoppedRef.current) {
        return;
      }

      // Check if render was successful based on output, not just exit code
      // aerender sometimes returns non-zero even on success
      // Use refs to get current values (avoid closure issues)
      const lastOutput = outputRef.current.join("");

      // Check if we got any meaningful output from aerender
      const gotAerenderOutput =
        lastOutput.includes("aerender") || lastOutput.includes("After Effects") || lastOutput.length > 100; // Got substantial output

      // Determine success based on multiple criteria
      const wasSuccessful =
        code === 0 ||
        hasRenderedFramesRef.current ||
        lastOutput.includes("Total Time Elapsed") ||
        lastOutput.includes("Finished composition");

      // If code is null, check if it's a legitimate completion or a crash
      // Null code + frames rendered = successful render
      // Null code + no output = failed to start
      if (code === null) {
        // Check if we actually rendered anything
        const hasFrameProgress = hasRenderedFramesRef.current || lastOutput.match(/PROGRESS:.*\(\d+\)/);

        if (
          hasFrameProgress ||
          lastOutput.includes("Total Time Elapsed") ||
          lastOutput.includes("Finished composition")
        ) {
          // Had actual rendering activity, treat as success
          setStatus("completed");

          await updateRenderInHistory(renderId, {
            endTime: new Date(),
            duration,
            totalFrames: totalFrames || undefined,
            status: "completed",
            pid: undefined, // Clear PID when completed
          });

          await showToast({
            style: Toast.Style.Success,
            title: getCompletionMessage(),
            message: `Rendered in ${formatDuration(duration)}`,
            primaryAction: {
              title: "Open Output Folder",
              onAction: async () => {
                await open(dirname(projectPath));
              },
            },
          });
        } else if (!gotAerenderOutput) {
          // No output at all - failed to start
          setStatus("failed");
          await updateRenderInHistory(renderId, {
            endTime: new Date(),
            duration,
            status: "failed",
            error: "Process failed to start - check aerender path",
            pid: undefined, // Clear PID when failed
          });

          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to Start",
            message: "AERender couldn't start. Check if the path is correct and After Effects is installed.",
          });
        }
        // If we got output but no frames, just exit silently
        // The process may have been interrupted during initialization
        return;
      }

      // Handle normal exit codes
      if (wasSuccessful) {
        setStatus("completed");

        // Update history
        await updateRenderInHistory(renderId, {
          endTime: new Date(),
          duration,
          totalFrames: totalFrames || undefined,
          status: "completed",
          pid: undefined, // Clear PID when completed
        });

        // Show completion with fun message
        await showToast({
          style: Toast.Style.Success,
          title: getCompletionMessage(),
          message: `Rendered in ${formatDuration(duration)}`,
          primaryAction: {
            title: "Open Output Folder",
            onAction: async () => {
              await open(dirname(projectPath));
            },
          },
        });
      } else {
        setStatus("failed");
        await updateRenderInHistory(renderId, {
          endTime: new Date(),
          duration,
          status: "failed",
          error: `Exit code: ${code}`,
          pid: undefined, // Clear PID when failed
        });

        await showToast({
          style: Toast.Style.Failure,
          title: "Render Failed",
          message: `Process exited with code ${code}. Check the output log for details.`,
        });
      }
    });

    // Cleanup
    return () => {
      if (interval) clearInterval(interval);
      if (renderProcess && !renderProcess.killed) {
        renderProcess.kill();
      }
    };
  }, [aerenderPath, projectPath, renderId]);

  const getStatusEmoji = () => {
    switch (status) {
      case "starting":
        return "";
      case "rendering":
        return "";
      case "completed":
        return "";
      case "failed":
        return "";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "starting":
        return "Starting Render";
      case "rendering":
        return "Rendering in Progress";
      case "completed":
        return "Render Complete!";
      case "failed":
        return "Render Failed";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "starting":
        return Color.Blue;
      case "rendering":
        return Color.Orange;
      case "completed":
        return Color.Green;
      case "failed":
        return Color.Red;
    }
  };

  const markdown = `
# ${getStatusEmoji()} ${getStatusText()}

${currentComp ? `## Rendering: ${currentComp}\n` : ""}

${status === "starting" ? "### Initializing...\nStarting up After Effects render engine. This usually takes a few seconds while we get everything ready.\n" : ""}
${status === "completed" ? "### All Done!\nYour render is complete and ready to go! Check out the output folder to see your result.\n" : ""}
${status === "rendering" ? "### Rendering...\nSit back, relax, and let the pixels flow. We'll let you know when it's done!\n" : ""}
${status === "failed" ? "### Something Went Wrong\nThe render encountered an issue. Check the output log below for details on what happened.\n" : ""}

---

### Output
\`\`\`
${output.slice(-15).join("").trim() || "Waiting for output..."}
\`\`\`
`;

  return (
    <Detail
      navigationTitle="Render Progress"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={getStatusText()} color={getStatusColor()} icon={getStatusEmoji()} />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Current Frame" text={currentFrame} icon={Icon.Video} />

          {totalFrames && (
            <Detail.Metadata.Label title="Total Frames" text={totalFrames.toString()} icon={Icon.BarChart} />
          )}

          <Detail.Metadata.Label title="Time Elapsed" text={formatDuration(elapsedTime)} icon={Icon.Clock} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Project"
            text={projectPath.split("/").pop() || "Unknown"}
            icon={Icon.Document}
          />

          <Detail.Metadata.Label
            title="AE Version"
            text={
              aerenderPath
                .split("/")
                .filter((p) => p.startsWith("Adobe After Effects"))
                .pop() || "Unknown"
            }
            icon={Icon.AppWindow}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {status === "completed" && (
            <>
              <Action
                title="Open Output Folder"
                icon={Icon.Folder}
                onAction={async () => {
                  await open(dirname(projectPath));
                }}
              />
              <Action.ShowInFinder title="Reveal Project in Finder" path={projectPath} />
              <Action
                title="Close"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd"], key: "w" }}
                onAction={popToRoot}
              />
            </>
          )}
          {(status === "rendering" || status === "starting") && (
            <>
              <Action.CopyToClipboard
                title="Copy Output Log"
                content={output.join("")}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Stop Rendering"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                onAction={stopRender}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </>
          )}
          {status === "failed" && (
            <>
              <Action.CopyToClipboard title="Copy Error Log" content={output.join("")} />
              <Action title="Close" icon={Icon.XMarkCircle} onAction={popToRoot} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
