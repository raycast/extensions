import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { PasteAction } from "../../components/paste-action";
import { ParsedMessage } from "../../utils/claude-message";
import CreateSnippet from "../create-snippet/list";

interface MessageDetailProps {
  message: ParsedMessage;
}

export default function MessageDetail({ message }: MessageDetailProps) {
  const title = message.preview;

  return (
    <Detail
      markdown={message.content}
      navigationTitle={title}
      actions={
        <ActionPanel>
          <PasteAction content={message.content} />
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={message.content}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <Action.Push
            title="Create Snippet"
            icon={Icon.Document}
            target={<CreateSnippet content={message.content} />}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    />
  );
}
