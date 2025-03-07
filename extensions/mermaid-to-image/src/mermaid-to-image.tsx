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

interface Preferences {
  outputFormat: "png" | "svg";
  theme: "default" | "forest" | "dark" | "neutral";
  savePath?: string;
}

// Image preview component
function ImagePreview(props: { imagePath: string; format: string }) {
  const { imagePath, format } = props;
  const preferences = getPreferenceValues<Preferences>();

  const [imageContent, setImageContent] = useState<string>("");
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (format === "svg") {
        setImageContent(fs.readFileSync(imagePath, "utf-8"));
      } else {
        const imageBuffer = fs.readFileSync(imagePath);
        setImageContent(`data:image/png;base64,${imageBuffer.toString("base64")}`);
      }
    } catch (error) {
      console.error("Failed to read image:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setImageError(`Unable to read image: ${errorMessage}`);
      (async () => {
        await showFailureToast({
          title: "Failed to load image",
          message: errorMessage,
        });
      })();
    }
  }, [imagePath, format]);

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

async function getSelectedText(): Promise<string | null> {
  try {
    // Save the current clipboard content
    const previousClipboard = await Clipboard.read();

    // Simulate cmd+c to copy selected text
    await execPromise('osascript -e \'tell application "System Events" to keystroke "c" using command down\'');

    // Small delay to ensure clipboard is updated
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Read the new clipboard content (which should be the selected text)
    const selectedText = await Clipboard.readText();

    // If nothing was selected, the clipboard content won't change
    if (selectedText === previousClipboard.text) {
      throw new Error("No text was selected");
    }

    // Restore previous clipboard content if needed
    if (previousClipboard.text !== selectedText) {
      await Clipboard.paste(previousClipboard);
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

async function generateMermaidDiagram(mermaidCode: string, preferences: Preferences) {
  let cleanCode = mermaidCode;
  if (cleanCode.includes("```mermaid")) {
    cleanCode = cleanCode.replace(/```mermaid\n/, "").replace(/```$/, "");
  }

  const tempFile = path.join(os.tmpdir(), `diagram-${Date.now()}.mmd`);
  try {
    fs.writeFileSync(tempFile, cleanCode);
  } catch (error: unknown) {
    console.error("Failed to write temporary file:", error);
    throw new Error(`Failed to create temporary file: ${error instanceof Error ? error.message : String(error)}`);
  }

  const outputPath = path.join(os.tmpdir(), `diagram-${Date.now()}.${preferences.outputFormat}`);

  console.log(`Generating diagram, theme: ${preferences.theme}, format: ${preferences.outputFormat}`);

  const possiblePaths = ["/usr/local/bin/mmdc", "/opt/homebrew/bin/mmdc"];

  let mmdcPath = "";
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      mmdcPath = p;
      break;
    }
  }

  if (!mmdcPath) {
    throw new Error("mermaid-cli (mmdc) command not found.");
  }

  const command = `"${mmdcPath}" -i "${tempFile}" -o "${outputPath}" -t ${preferences.theme} -b transparent --scale 2`;
  const env = {
    ...process.env,
    NODE_OPTIONS: "--max-old-space-size=4096",
    PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH}`,
  };

  return await launchCommand(command, env, outputPath, tempFile);
}

async function launchCommand(
  command: string,
  env: NodeJS.ProcessEnv,
  outputPath: string,
  tempFile: string,
): Promise<string> {
  try {
    await execPromise(command, { env, timeout: 10000 });

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Diagram generation failed: Output file not found ${outputPath}`);
    }

    // Clean up temporary .mmd file
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log("Temporary file cleaned up after success:", tempFile);
      }
    } catch (cleanupError) {
      console.error("Failed to clean up temporary file:", cleanupError);
    }

    return outputPath;
  } catch (error: unknown) {
    console.error("Command execution failed:", error);
    // Clean up temporary files
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log("Temporary file cleaned up after error:", tempFile);
      }
    } catch (cleanupError) {
      console.error("Failed to clean up temporary file:", cleanupError);
    }
    throw new Error(`Failed to generate diagram: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isProcessingRef = useRef(false);

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

      const outputPath = await generateMermaidDiagram(mermaidCode, preferences);
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
      if (imagePath && fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
          console.log("Temporary file cleaned up:", imagePath);
        } catch (error) {
          console.error("Failed to clean up temporary file:", error);
        }
      }
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
                isProcessingRef.current = false;
                setIsLoading(false);
                setError("Operation cancelled by user.");
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
          </ActionPanel>
        }
      />
    );
  }

  if (imagePath) {
    return <ImagePreview imagePath={imagePath} format={preferences.outputFormat} />;
  }

  // Fallback state
  return (
    <Detail
      markdown="# Generating diagram, please wait..."
      actions={
        <ActionPanel>
          <Action
            title="Generate from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => processMermaidCode(false)}
          />
        </ActionPanel>
      }
    />
  );
}
