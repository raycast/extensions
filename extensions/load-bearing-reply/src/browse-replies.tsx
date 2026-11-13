import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { replies } from "./replies";

export default function Command() {
  return (
    <List navigationTitle="Load-Bearing Reply" searchBarPlaceholder="Find a reply to paste…">
      {replies.map((reply) => (
        <List.Item
          key={reply.text}
          icon={Icon.Message}
          title={reply.text}
          accessories={[{ text: reply.mode }]}
          actions={
            <ActionPanel>
              <Action.Paste content={reply.text} title="Paste into Active App" />
              <Action.CopyToClipboard content={reply.text} title="Copy Reply" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
