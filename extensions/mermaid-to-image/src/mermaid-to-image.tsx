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

  let imageContent = "";
  try {
    if (format === "svg") {
      imageContent = fs.readFileSync(imagePath, "utf-8");
    } else {
      const imageBuffer = fs.readFileSync(imagePath);
      imageContent = `data:image/png;base64,${imageBuffer.toString("base64")}`;
    }
  } catch (error) {
    console.error("Failed to read image:", error);
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

  try {
    await execPromise(command, { env, timeout: 10000 });

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Diagram generation failed: Output file not found ${outputPath}`);
    }

    // 清理臨時 .mmd 檔案
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log("Temporary file cleaned up after success:", tempFile);
      }
    } catch (cleanupError) {
      console.error("Failed to clean up temporary file:", cleanupError);
    }
  } catch (error: unknown) {
    console.error("Command execution failed:", error);
    // 清理臨時文件
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

  return outputPath;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isProcessingRef = useRef(false);

  async function processClipboard() {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      setIsLoading(true);
      setError(null);

      let clipboardText;
      try {
        clipboardText = await Clipboard.readText();
        if (!clipboardText) {
          setError("Clipboard is empty.");
          setIsLoading(false);
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

      await showToast({
        style: Toast.Style.Animated,
        title: "Generating diagram...",
      });

      const outputPath = await generateMermaidDiagram(clipboardText, preferences);
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
    processClipboard();
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
    return <Detail markdown="# Generating diagram, please wait..." />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Diagram generation failed\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.RotateClockwise} onAction={processClipboard} />
          </ActionPanel>
        }
      />
    );
  }

  if (imagePath) {
    return <ImagePreview imagePath={imagePath} format={preferences.outputFormat} />;
  }

  return <Detail markdown="# Unknown error occurred" />;
}
