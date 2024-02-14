import { Action, ActionPanel, Icon, List, showToast, Toast, confirmAlert, Color, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import AddOrEditAuthor from "./add-or-edit-author";
import { Authors } from "./types";
import { cache, getAuthorsArrFromCache, KEY, removeAuthorFromCache } from "./utils";

export default function ChooseAuthor() {
  const [authors, setAuthors] = useState<Authors>(getAuthorsArrFromCache());
  const [selectedAuthors, setSelectedAuthors] = useState<Authors>([]);

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
          icon={
            selectedAuthors.filter((_author) => _author.email === author.email).length == 1 ? Icon.Check : Icon.Minus
          }
          key={author.email}
          actions={
            <ActionPanel>
              <Action
                title={`Select ${author.name}`}
                icon={Icon.Check}
                onAction={async () => {
                  // If the author is already selected and the user clicks this action, we need to
                  // remove this author from the selected authors array:
                  if (selectedAuthors.filter((_author) => _author.email === author.email).length == 1) {
                    setSelectedAuthors([...selectedAuthors.filter((_author) => _author.email !== author.email)]);

                    await showToast(Toast.Style.Success, `Author ${author.name} unselected`);
                    return;
                  }

                  setSelectedAuthors([...selectedAuthors.filter((_author) => _author.email !== author.email), author]);

                  await showToast(Toast.Style.Success, `Author ${author.name} selected`);
                }}
              />

              {selectedAuthors.length > 0 && (
                <>
                  <Action.CopyToClipboard
                    content={selectedAuthors
                      .map((selectedAuthor) => `Co-authored-by: ${selectedAuthor.name} <${selectedAuthor.email}>`)
                      .join("\n")}
                  />
                  <Action.Paste
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    content={selectedAuthors
                      .map((selectedAuthor) => `Co-authored-by: ${selectedAuthor.name} <${selectedAuthor.email}>`)
                      .join("\n")}
                  />
                </>
              )}
              <Action.Push
                title={`Edit ${author.name}`}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
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
