import { ActionPanel, Action, List, Icon } from "@raycast/api";

import { HighlightDetail } from "./HighlightDetail";

export const HighlightsList = ({ item }: { item: Highlight }) => {
  return (
    <List.Item
      title={item.text}
      subtitle={item.note}
      accessories={[{ text: item.url, icon: Icon.Link }]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" target={<HighlightDetail item={item} />} />
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={item.url} />
            <Action.CopyToClipboard title="Copy Text" content={item.text} shortcut={{ modifiers: ["cmd"], key: "." }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
