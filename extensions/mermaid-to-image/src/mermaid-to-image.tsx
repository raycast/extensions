import {
  showToast,
  Toast,
  getPreferenceValues,
  Detail,
  Icon,
  Clipboard,
  ActionPanel,
  Action,
  open,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import { exec } from "child_process";
import { useEffect, useState, useRef } from "react";

const execPromise = promisify(exec);

// Removed Preferences interface as it's auto-generated in raycast-env.d.ts

// Image preview component
function ImagePreview(props: { imagePath: string; format: string }) {
  const { imagePath, format } = props;
  const preferences = getPreferenceValues();

  const [imageContent, setImageContent] = useState<string>("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Added loading state

  useEffect(() => {
    const loadImage = async () => {
      try {
        setIsLoading(true);
        if (format === "svg") {
          setImageContent(fs.readFileSync(imagePath, "utf-8"));
        } else {
          const imageBuffer = fs.readFileSync(imagePath);
          setImageContent(`data:image/png;base64,${imageBuffer.toString("base64")}`);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to read image:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setImageError(`Unable to read image: ${errorMessage}`);
        setIsLoading(false);
        await showFailureToast({
          title: "Failed to load image",
          message: errorMessage,
        });
      }
    };

    loadImage();
  }, [imagePath, format]);

  if (isLoading) {
    return <Detail markdown="# Loading image..." isLoading={true} />;
  }

  if (imageError) {
    return <Detail markdown={`# Image loading failed\n\n${imageError}`} />;
  }

  const markdown = format === "svg" ? `<svg>${imageContent}</svg>` : `![Mermaid Diagram](${imageContent})`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Image"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => {
              try {
                if (format === "svg") {
                  await Clipboard.copy(imageContent);
                } else {
                  await execPromise(
                    `osascript -e 'set the clipboard to (read (POSIX file "${imagePath}") as TIFF picture)'`,
                  );
                }
                await showToast({
                  style: Toast.Style.Success,
                  title: "Image copied",
                });
              } catch (error) {
                console.error("Copy error:", error);
                await showFailureToast({
                  title: "Copy failed",
                  message: String(error),
                });
              }
            }}
          />
          <Action
            title="Save Image"
            icon={Icon.SaveDocument}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={async () => {
              try {
                const customSavePath = preferences.savePath?.trim();
                let saveDir = path.join(os.homedir(), "Downloads");
                if (customSavePath && fs.existsSync(customSavePath)) {
                  saveDir = customSavePath;
                }
                const savedPath = path.join(saveDir, `mermaid-diagram-${Date.now()}.${format}`);
                fs.copyFileSync(imagePath, savedPath);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Image saved",
                  message: `Saved to ${savedPath}`,
                });
                await open(path.dirname(savedPath));
              } catch (error) {
                await showFailureToast({
                  title: "Save failed",
                  message: String(error),
                });
              }
            }}
          />
          <Action
            title="Open in Default App"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={async () => {
              try {
                await open(imagePath);
              } catch (error) {
                await showFailureToast({
                  title: "Failed to open image",
                  message: String(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}

// Improved function to check for mmdc command availability
async function findMmdcPath(): Promise<string> {
  const possiblePaths = [
    "/usr/local/bin/mmdc",
    "/opt/homebrew/bin/mmdc",
    "~/.npm-global/bin/mmdc",
    "/usr/bin/mmdc",
    path.join(os.homedir(), ".npm-global/bin/mmdc"),
  ];

  // First check if mmdc is in PATH
  try {
    const { stdout } = await execPromise("which mmdc");
    if (stdout.trim()) {
      console.log("Found mmdc in PATH:", stdout.trim());
      return stdout.trim();
    }
  } catch (error) {
    // Command not found in PATH, continue with checking specific locations
    console.log("mmdc not found in PATH, checking specific locations...");
    console.error("which mmdc error:", error instanceof Error ? error.message : String(error));

    await showToast({
      style: Toast.Style.Animated,
      title: "Looking for mermaid-cli...",
      message: "Not found in PATH, checking other locations",
    });
  }

  // Check specific locations
  for (const p of possiblePaths) {
    const expandedPath = p.startsWith("~/") ? p.replace("~/", `${os.homedir()}/`) : p;
    if (fs.existsSync(expandedPath)) {
      console.log("Found mmdc at specific location:", expandedPath);

      await showToast({
        style: Toast.Style.Success,
        title: "Found mermaid-cli",
        message: `Located at ${expandedPath}`,
      });

      return expandedPath;
    }
  }

  console.error("mmdc not found in any of the expected locations:", possiblePaths);

  // Using showFailureToast instead of showToast with Style.Failure for consistency
  await showFailureToast({
    title: "mermaid-cli not found",
    message: "Please install with 'npm install -g @mermaid-js/mermaid-cli'",
  });

  throw new Error(
    "mermaid-cli (mmdc) command not found. Please install it with 'npm install -g @mermaid-js/mermaid-cli'",
  );
}

// Improved function to safely clean up temporary files
function cleanupTempFile(filePath: string | null): void {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log("Temporary file cleaned up:", filePath);
    } catch (error) {
      console.error("Failed to clean up temporary file:", error);
    }
  }
}

async function getSelectedText(): Promise<string | null> {
  try {
    // Save the current clipboard content
    const previousClipboard = await Clipboard.read();
    const previousText = previousClipboard.text || "";

    // Simulate cmd+c to copy selected text
    await execPromise('osascript -e \'tell application "System Events" to keystroke "c" using command down\'');

    // Small delay to ensure clipboard is updated
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Read the new clipboard content (which should be the selected text)
    const selectedText = await Clipboard.readText();

    // If selectedText is undefined or empty, return null
    if (!selectedText) {
      // Restore previous clipboard if needed
      if (previousText) {
        await Clipboard.paste(previousText);
      }
      return null;
    }

    // If nothing was selected, the clipboard content won't change
    if (selectedText === previousText) {
      return null;
    }

    // Restore previous clipboard content if needed
    if (previousText && previousText !== selectedText) {
      await Clipboard.paste(previousText);
    }

    return selectedText;
  } catch (error) {
    console.error("Failed to get selected text:", error);
    await showFailureToast({
      title: "Failed to get selected text",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function generateMermaidDiagram(mermaidCode: string, tempFileRef: React.MutableRefObject<string | null>) {
  const preferences = getPreferenceValues();

  let cleanCode = mermaidCode;
  if (cleanCode.includes("```mermaid")) {
    cleanCode = cleanCode.replace(/```mermaid\n/, "").replace(/```$/, "");
  }

  const tempFile = path.join(os.tmpdir(), `diagram-${Date.now()}.mmd`);
  tempFileRef.current = tempFile; // Store the tempFile path in the ref

  try {
    fs.writeFileSync(tempFile, cleanCode);
  } catch (error: unknown) {
    console.error("Failed to write temporary file:", error);
    throw new Error(`Failed to create temporary file: ${error instanceof Error ? error.message : String(error)}`);
  }

  const outputPath = path.join(os.tmpdir(), `diagram-${Date.now()}.${preferences.outputFormat}`);

  console.log(`Generating diagram, theme: ${preferences.theme}, format: ${preferences.outputFormat}`);

  // Check for mmdc command availability
  const mmdcPath = await findMmdcPath();

  const command = `"${mmdcPath}" -i "${tempFile}" -o "${outputPath}" -t ${preferences.theme} -b transparent --scale 2`;
  const env = {
    ...process.env,
    NODE_OPTIONS: "--max-old-space-size=4096",
    PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH}`,
  };

  // Get timeout from preferences and convert to number in milliseconds
  const timeoutStr = preferences.generationTimeout || "10";
  const timeoutInMs = parseInt(timeoutStr, 10) * 1000;

  return await launchCommand(command, env, outputPath, tempFile, tempFileRef, timeoutInMs);
}

async function launchCommand(
  command: string,
  env: NodeJS.ProcessEnv,
  outputPath: string,
  tempFile: string,
  tempFileRef: React.MutableRefObject<string | null>,
  timeout: number,
): Promise<string> {
  try {
    await execPromise(command, { env, timeout });

    if (!fs.existsSync(outputPath)) {
      cleanupTempFile(tempFile);
      tempFileRef.current = null;
      throw new Error(`Diagram generation failed: Output file not found ${outputPath}`);
    }

    // Clean up temporary .mmd file
    cleanupTempFile(tempFile);
    tempFileRef.current = null;

    return outputPath;
  } catch (error: unknown) {
    console.error("Command execution failed:", error);

    // Clean up temporary files
    cleanupTempFile(tempFile);
    tempFileRef.current = null;

    // Provide more specific error messages
    if (error instanceof Error && error.message.includes("ETIMEDOUT")) {
      throw new Error(
        `Diagram generation timed out after ${timeout / 1000} seconds. Try increasing the timeout in preferences.`,
      );
    }

    throw new Error(`Failed to generate diagram: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export default function Command() {
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isProcessingRef = useRef(false);
  const tempFileRef = useRef<string | null>(null);

  async function processMermaidCode(useSelection = false) {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      setIsLoading(true);
      setError(null);

      let mermaidCode;

      if (useSelection) {
        // Try to get selected text
        mermaidCode = await getSelectedText();
        if (!mermaidCode) {
          setError("No text was selected.");
          setIsLoading(false);
          await showFailureToast({
            title: "Failed to generate diagram",
            message: "No text was selected. Please select Mermaid diagram code first.",
          });
          return;
        }
      } else {
        // Use clipboard content
        try {
          mermaidCode = await Clipboard.readText();
          if (!mermaidCode) {
            setError("Clipboard is empty.");
            setIsLoading(false);
            await showFailureToast({
              title: "Failed to generate diagram",
              message: "Clipboard is empty. Please copy a Mermaid diagram code first.",
            });
            return;
          }
        } catch (error: unknown) {
          console.error("Failed to read clipboard:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          setError(`Failed to read clipboard: ${errorMessage}`);
          setIsLoading(false);
          await showFailureToast({
            title: "Failed to read clipboard",
            message: errorMessage,
          });
          return;
        }
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Generating diagram...",
      });

      const outputPath = await generateMermaidDiagram(mermaidCode, tempFileRef);
      setImagePath(outputPath);

      await showToast({
        style: Toast.Style.Success,
        title: "Diagram generated successfully",
      });
    } catch (error) {
      console.error("Error details:", error);
      setError(String(error));
      await showFailureToast({
        title: "Diagram generation failed",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  }

  useEffect(() => {
    processMermaidCode(false); // Default to using clipboard content
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup temporary image file
      cleanupTempFile(imagePath);

      // Cleanup temporary .mmd file
      cleanupTempFile(tempFileRef.current);
    };
  }, [imagePath]);

  if (isLoading) {
    return (
      <Detail
        markdown="# Generating diagram, please wait..."
        isLoading={true}
        actions={
          <ActionPanel>
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              onAction={() => {
                // Clean up any temporary files before canceling
                if (tempFileRef.current) {
                  cleanupTempFile(tempFileRef.current);
                  tempFileRef.current = null;
                }

                isProcessingRef.current = false;
                setIsLoading(false);
                setError("Operation cancelled by user.");

                // Show toast to confirm cancellation
                (async () => {
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Operation cancelled",
                    message: "Temporary files have been cleaned up",
                  });
                })();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (error) {
    return (
      <Detail
        markdown={`# Diagram generation failed\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              title="Generate from Clipboard"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => processMermaidCode(false)}
            />
            <Action
              title="Generate from Selection"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() => processMermaidCode(true)}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (imagePath) {
    return <ImagePreview imagePath={imagePath} format={getPreferenceValues().outputFormat} />;
  }

  // Fallback state
  return (
    <Detail
      markdown="# Ready to generate diagram\n\nCopy Mermaid diagram code to your clipboard and press the Generate button.\n\n*Note: Make sure your clipboard contains valid Mermaid syntax.*"
      actions={
        <ActionPanel>
          <Action
            title="Generate from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => processMermaidCode(false)}
          />
          <Action
            title="Generate from Selection"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => processMermaidCode(true)}
          />
        </ActionPanel>
      }
    />
  );
}
