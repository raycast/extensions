import React, { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import { exec } from "child_process";
import {
  Detail,
  Icon,
  Clipboard,
  ActionPanel,
  Action,
  open,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Preferences } from "../types";

const execPromise = promisify(exec);

interface ImagePreviewProps {
  imagePath: string;
  format: string;
}

export function ImagePreview({ imagePath, format }: ImagePreviewProps) {
  const preferences = getPreferenceValues<Preferences>();

  const [imageContent, setImageContent] = useState<string>("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
        await showFailureToast(error, {
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
                await showFailureToast(error, {
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
                await showFailureToast(error, {
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
                await showFailureToast(error, {
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
