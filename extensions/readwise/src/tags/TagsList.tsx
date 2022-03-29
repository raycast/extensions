import { ActionPanel, Action, List, Icon } from "@raycast/api";

export const TagsList = ({ item }: { item: Tag }) => {
  const tagUrl = `https://readwise.io/tags/${encodeURIComponent(item.name)}`;

  return (
    <List.Item
      title={item.name}
      accessories={(tagUrl && [{ text: tagUrl, icon: Icon.Link }]) || undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {tagUrl && <Action.OpenInBrowser title="Open in Browser" url={tagUrl} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
