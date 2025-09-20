import { ReactNode } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { BookDetail } from "./BookDetail";

import { Book } from "./types";

export const BooksListItems = ({ actions, item }: { actions: ReactNode; item: Book }) => {
  return (
    <List.Item
      title={item.title}
      subtitle={item.author}
      keywords={item.tags.map((tag) => tag.name)}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Document} title="Show Details" target={<BookDetail item={item} />} />
          <Action.OpenInBrowser title="Open in Browser" url={item.highlights_url} />
          {actions}
        </ActionPanel>
      }
    />
  );
};
