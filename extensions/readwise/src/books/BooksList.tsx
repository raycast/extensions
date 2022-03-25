import { Action, ActionPanel, List } from "@raycast/api";
import { BookDetail } from "./BookDetail";

import { Book } from "./types";

export const BooksList = ({ item }: { item: Book }) => {
  return (
    <List.Item
      title={item.title}
      subtitle={item.author}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" target={<BookDetail item={item} />} />
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={item.highlights_url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
