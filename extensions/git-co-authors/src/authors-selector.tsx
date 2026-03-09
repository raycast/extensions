import { Action, ActionPanel, Icon, Color, List, closeMainWindow, PopToRootType, showHUD } from "@raycast/api";
import { Author, Authors } from "./types";
import { useState } from "react";
import { addAllAuthorsToCache } from "./utils";

export type AuthorsSelectorProps = {
  authors: Authors;
  allSelected?: boolean;
};

type AuthorListItem = {
  author: Author;
  selected: boolean;
};

export default function AuthorsSelector({ authors, allSelected }: AuthorsSelectorProps) {
  const [items, setItems] = useState<AuthorListItem[]>(authors.map((author) => ({ author, selected: !!allSelected })));

  return (
    <List>
      {items.map((item, idx) => {
        return (
          <List.Item
            key={item.author.email}
            title={item.author.name + ""}
            subtitle={item.author.email}
            icon={
              item.selected
                ? { source: Icon.CheckCircle, tintColor: Color.Blue }
                : { source: Icon.Circle, tintColor: Color.SecondaryText }
            }
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  onAction={() => {
                    const newItems = [...items];
                    newItems[idx].selected = !newItems[idx].selected;
                    setItems(newItems);
                  }}
                />
                <Action
                  title="Save Selected Authors"
                  onAction={() => {
                    addAllAuthorsToCache(items.filter((item) => item.selected).map((item) => item.author));
                    showHUD("Selected authors saved");
                    closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
                  }}
                  icon={{ source: Icon.SaveDocument, tintColor: Color.Green }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
