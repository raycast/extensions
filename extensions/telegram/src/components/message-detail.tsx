import { Detail, ActionPanel, Action } from "@raycast/api";
import { SavedMessage } from "../services/telegram-client";
import { buildMarkdownWithMedia } from "../utils/markdown";

interface MessageDetailProps {
  message: SavedMessage;
}

export function MessageDetail({ message }: MessageDetailProps) {
  const markdown = buildMarkdownWithMedia({
    media: message.media,
    text: message.text,
  });

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
