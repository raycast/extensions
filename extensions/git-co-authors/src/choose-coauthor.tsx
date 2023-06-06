import { Action, ActionPanel, Icon, List, showToast, Toast, confirmAlert, Color, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import AddOrEditAuthor from "./add-or-edit-author";
import { Authors } from "./types";
import { cache, getAuthorsArrFromCache, KEY, removeAuthorFromCache } from "./utils";

export default function ChooseAuthor() {
  const [authors, setAuthors] = useState<Authors>(getAuthorsArrFromCache());
  useEffect(() => {
    return cache.subscribe((key, data) => {
      if (key === KEY && data) {
        setAuthors(JSON.parse(data));
      }
    });
  }, []);

  return (
    <List searchBarPlaceholder="Dana Scully">
      {authors.map((author) => (
        <List.Item
          title={author.name}
          subtitle={author.email}
          key={author.email}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={`Co-authored-by: ${author.name} <${author.email}>`} />
              <Action.Push
                title={`Edit ${author.name}`}
                target={<AddOrEditAuthor author={author} />}
                icon={Icon.Pencil}
              />
              <Action
                title={`Remove ${author.name}`}
                icon={Icon.RemovePerson}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={async () => {
                  await confirmAlert({
                    title: "Remove Author",
                    message: `Are you sure you want to remove ${author.name}?`,
                    icon: { source: Icon.RemovePerson, tintColor: Color.Red },
                    primaryAction: {
                      title: "Remove",
                      style: Alert.ActionStyle.Destructive,
                      onAction: () => {
                        removeAuthorFromCache(author.email);
                        showToast(Toast.Style.Success, `Removed ${author.name}`);
                      },
                    },
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
