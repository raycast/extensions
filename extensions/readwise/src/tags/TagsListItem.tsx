import { ReactNode } from "react";
import { ActionPanel, Action, List, Icon } from "@raycast/api";

export const TagsListItem = ({ actions, item }: { actions: ReactNode; item: Tag }) => {
  const tagUrl = `https://readwise.io/tags/${encodeURIComponent(item.name)}`;

  return (
    <List.Item
      title={item.name}
      accessories={(tagUrl && [{ text: tagUrl, icon: Icon.Link }]) || undefined}
      actions={
        <ActionPanel>
          {tagUrl && <Action.OpenInBrowser title="Open in Browser" url={tagUrl} />}
          {actions}
        </ActionPanel>
      }
    />
  );
};
