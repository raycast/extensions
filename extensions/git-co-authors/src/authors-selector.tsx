import {
  Action,
  ActionPanel,
  Icon,
  Color,
  List,
  Toast,
  closeMainWindow,
  PopToRootType,
  showHUD,
  showToast,
} from "@raycast/api";
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
                    setItems(items.map((item, i) => (i === idx ? { ...item, selected: !item.selected } : item)));
                  }}
                />
                <Action
                  title="Save Selected Authors"
                  onAction={() => {
                    const selected = items.filter((item) => item.selected).map((item) => item.author);
                    if (selected.length === 0) {
                      showToast({ style: Toast.Style.Failure, title: "No authors selected" });
                      return;
                    }
                    addAllAuthorsToCache(selected);
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
