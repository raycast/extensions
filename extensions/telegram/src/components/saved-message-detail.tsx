import { Detail, ActionPanel, Action } from "@raycast/api";
import { SavedMessage } from "../services/telegram-client";
import { buildMarkdownWithMedia } from "../utils/markdown";

interface SavedMessageDetailProps {
  message: SavedMessage;
}

export function SavedMessageDetail({ message }: SavedMessageDetailProps) {
  const markdown = buildMarkdownWithMedia({
    text: message.text,
    media: message.media,
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
