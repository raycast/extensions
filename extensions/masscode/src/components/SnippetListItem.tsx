import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import type { ListItem } from "../types";

export function SnippetListItem({ item }: { item: ListItem }) {
  const markdownDetail = `**Fragment:** ${item.name}\n\n**Language:** ${item.language}\n\`\`\`${item.language}\n${item.value}\n\`\`\``;

  return (
    <List.Item
      title={item.snippetName}
      icon={Icon.Document}
      accessories={[{ text: item.description }]}
      detail={<List.Item.Detail markdown={markdownDetail} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={item.value} />
          <Action
            title="Open in massCode"
            icon={Icon.AppWindow}
            onAction={() => open(`masscode://snippet/${item.id}`)}
          />
        </ActionPanel>
      }
    />
  );
}
