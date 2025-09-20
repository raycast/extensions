import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getSelectedFinderItems,
  Icon,
  showHUD,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ChildProcess, exec, execSync, spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { useEffect, useRef, useState } from "react";

function getUserShellPath() {
  const shell = os.userInfo().shell || "/bin/sh";
  const command = `${shell} -l -i -c 'echo $PATH'`;

  try {
    const PATH = execSync(command).toString().trim();
    // Add ~/.local/bin to the PATH
    const localBinPath = path.join(os.homedir(), ".local", "bin");
    return `${localBinPath}:${PATH}`;
  } catch (error) {
    console.error("Error retrieving shell PATH:", error);
    return process.env.PATH || "";
  }
}

process.env.PATH = getUserShellPath();

import { Alert, confirmAlert } from "@raycast/api";

function isCommandInstalled(command: string) {
  try {
    execSync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}

let childProcess: ChildProcess | null = null;

let fileStream: ChildProcess | null = null;
const logFilePath = path.join("/tmp", "scenedetect.log");

export default function Command() {
  const [logs, setLogs] = useState("");
  const [detectionMethod, setDetectionMethod] = useState("detect-content");
  const finderItems = usePromise(
    async () => {
      try {
        return await getSelectedFinderItems();
      } catch (error) {
        return [];
      }
    },
    [],
    {
      onData(data) {
        const els = data?.map((item) => item.path) || [];
        if (els.length > 0) {
          setFilePaths(els);
        }
      },
    },
  );

  useAsyncEffect(() => {
    return attachToLogsFile();
  }, [setLogs]);

  async function handleSubmit() {
    if (!filePaths || filePaths.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "No file selected", message: "Please select a video file first" });
      return;
    }

    if (!isCommandInstalled("scenedetect")) {
      if (!isCommandInstalled("brew")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Homebrew and scenedetect not installed",
          message:
            "Please install scenedetect first or Homebrew (so the extension can automatically install scenedetect) ",
        });
        return;
      }
      const options: Alert.Options = {
        title: "scenedetect command not found",
        message: "The command 'scenedetect' is not installed. Do you want to install it with pipx now?",
        primaryAction: {
          title: "Install",
          onAction: async () => {
            const installCommand = 'brew install pipx && pipx install "scenedetect[opencv]" --force';
            console.log(`Executing install command: ${installCommand}`);
            setLogs((prevLogs) => `Executing install command: ${installCommand}\n${prevLogs}`);

            if (childProcess) {
              childProcess.kill();
            }
            childProcess = exec(installCommand, {
              env: { ...process.env, HOMEBREW_NO_AUTO_UPDATE: "1" },
            });

            childProcess.stdout?.on("data", (data) => {
              if (childProcess?.killed) {
                return;
              }
              console.error(data.toString());
              setLogs((prevLogs) => `${data.toString()}\n${prevLogs}`);
            });

            childProcess.stderr?.on("data", (data) => {
              if (childProcess?.killed) {
                return;
              }
              console.error(data.toString());
              setLogs((prevLogs) => `${data.toString()}\n${prevLogs}`);
            });

            const exitCode = await new Promise((resolve) => childProcess!.on("exit", (code) => resolve(code || 0)));

            if (exitCode === 0) {
              setLogs("");
              process.env.PATH = getUserShellPath();
            } else {
              showToast({ style: Toast.Style.Failure, title: "Error", message: "Failed to install command" });
            }
          },
        },
        dismissAction: {
          title: "Cancel",
        },
      };
      await confirmAlert(options);
      return;
    }

    let exitCode = 0;

    fs.writeFileSync(logFilePath, "");
    const outputLogFile = fs.openSync(logFilePath, "w");
    let outputDir = "";
    for (const videoPath of filePaths) {
      outputDir = path.join(path.dirname(videoPath), path.basename(videoPath, path.extname(videoPath)));

      const command = `scenedetect -i "${videoPath}" -o "${outputDir}" ${detectionMethod} split-video; echo 'deleting log file'; rm "${logFilePath}"`;

      console.log(`Executing command: ${command}`);
      setLogs((prevLogs) => `Executing command: ${command}\n${prevLogs}`);

      childProcess = spawn(command, {
        env: { ...process.env },
        shell: true,
        stdio: ["ignore", outputLogFile, outputLogFile],
        detached: true,
      });
      childProcess.unref();
      attachToLogsFile();
      exitCode = await new Promise((resolve) => childProcess!.on("close", (code) => resolve(code || 0)));
    }
    if (exitCode === 0) {
      await showHUD("Scenes Split Successfully");
      await showInFinder(outputDir);
    }
  }

  async function attachToLogsFile() {
    console.log("Attaching to logs file");

    if (!fs.existsSync(logFilePath)) {
      return;
    }
    if (fileStream) {
      return;
    }
    const intervalId = setInterval(() => {
      if (!fs.existsSync(logFilePath)) {
        setLogs("");
        console.log("Log file deleted, killing tail process");
        if (fileStream) {
          fileStream.kill();
          fileStream = null;
        }
        clearInterval(intervalId);
      }
    }, 1000);

    const initialContent = fs.readFileSync(logFilePath, "utf8");
    const reversedContent = initialContent.split("\n").reverse().join("\n");
    setLogs((prevLogs) => `${reversedContent}\n${prevLogs}`);
    fileStream = spawn("tail", ["-f", logFilePath]);
    fileStream?.stdout?.on("data", (data) => {
      console.log(data.toString());
      setLogs((prevLogs) => `${data.toString()}\n${prevLogs}`);
    });
    fileStream?.stderr?.on("data", (data) => {
      console.log(data.toString());
      setLogs((prevLogs) => `${data.toString()}\n${prevLogs}`);
    });
    await new Promise((resolve) => fileStream?.on("close", (code) => resolve(code || 0)));
  }

  const [filePaths, setFilePaths] = useState(finderItems?.data?.map((x) => x.path) || []);

  async function handleCancel() {
    if (fileStream) {
      fs.unlinkSync(logFilePath);
      fileStream.kill();
    }
    if (!childProcess) {
      return;
    }
    childProcess.kill();
    await new Promise((resolve) => childProcess!.on("close", (code) => resolve(code || 0)));
    setLogs("");
  }

  if (logs) {
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action icon={Icon.Trash} title="Cancel" onAction={handleCancel} />
          </ActionPanel>
        }
        isLoading={true}
        key="markdown logs"
        markdown={"```\n" + logs + "\n```"}
      />
    );
  }

  return (
    <Form
      isLoading={finderItems.isLoading}
      searchBarAccessory={
        <Form.LinkAccessory target="https://github.com/sponsors/remorses" text="Sponsor Extension Creator" />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Split Video into Scenes" />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        canChooseDirectories={false}
        canChooseFiles={true}
        autoFocus
        title="Select Video Files"
        value={filePaths}
        onChange={setFilePaths}
      />
      <Form.Dropdown
        id="detectionMethod"
        title="Detection Method"
        info="Threshold detects fades using frame intensity, content detects fast cuts by comparing adjacent frames, and adaptive compares frame scores to neighbors."
        value={detectionMethod}
        onChange={setDetectionMethod}
      >
        <Form.Dropdown.Item value="detect-content" title="Content Detection" />
        <Form.Dropdown.Item value="detect-threshold" title="Threshold Detection" />
        <Form.Dropdown.Item value="detect-adaptive" title="Adaptive Detection" />
      </Form.Dropdown>
    </Form>
  );
}

function useAsyncEffect(effect: () => Promise<void>, deps: object[]) {
  const isProcessing = useRef(false);

  useEffect(() => {
    if (!isProcessing.current) {
      isProcessing.current = true;
      effect()
        .catch((error) => {
          console.error("Error in useAsyncEffect:", error);
        })
        .finally(() => {
          isProcessing.current = false;
        });
    }
  }, deps);
}
