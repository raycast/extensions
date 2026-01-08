import { Detail, ActionPanel, Action } from "@raycast/api";
import * as fs from "fs";
import { SavedMessage } from "../services/telegram-client";

interface MessageDetailProps {
  message: SavedMessage;
}

export function MessageDetail({ message }: MessageDetailProps) {
  let markdown = "";

  // Convert image to base64 and embed in markdown if media file path is available
  if (message.media?.filePath && ["photo", "image"].includes(message.media.type)) {
    try {
      if (fs.existsSync(message.media.filePath)) {
        const imageBuffer = fs.readFileSync(message.media.filePath);
        const base64Image = imageBuffer.toString("base64");
        const mimeType = message.media.mimeType || "image/jpeg";
        markdown = `![](data:${mimeType};base64,${base64Image})`;
      }
    } catch (error) {
      console.error("Failed to read image file:", error);
    }
  }

  // Add message text if available
  if (message.text) {
    if (markdown) {
      markdown += "\n\n" + message.text;
    } else {
      markdown = message.text;
    }
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={message.text} title="Copy Message" />
          {message.media?.filePath && (
            <Action.OpenWith path={message.media?.filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          )}
        </ActionPanel>
      }
    />
  );
}
