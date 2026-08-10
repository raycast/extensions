import { Action, ActionPanel, Icon, List, showToast, Toast, confirmAlert, Color, Alert, popToRoot } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useEffect, useState } from "react";
import AddOrEditAuthor from "./add-or-edit-author";
import { Authors } from "./types";
import { cache, clearAuthorsCache, getAuthorsArrFromCache, KEY, removeAuthorFromCache } from "./utils";

export default function ChooseAuthor() {
  const [authors, setAuthors] = useState<Authors>(getAuthorsArrFromCache());
  const {
    data: sortedData,
    visitItem,
    resetRanking,
  } = useFrecencySorting(authors.map((author) => ({ ...author, id: author.email })));

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
      <List.EmptyView
        title="No co-authors yet"
        description='Use the "Add Author" or "Load Co-Authors from Folder" commands to get started.'
        icon={Icon.AddPerson}
      />
      {sortedData.map((author) => (
        <List.Item
          title={author.name}
          subtitle={author.email}
          icon={
            selectedAuthors.filter((_author) => _author.email === author.email).length == 1
              ? { source: Icon.CheckCircle, tintColor: Color.Blue }
              : { source: Icon.Circle, tintColor: Color.SecondaryText }
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

                  visitItem(author);
                  setSelectedAuthors([...selectedAuthors.filter((_author) => _author.email !== author.email), author]);

                  await showToast(Toast.Style.Success, `Author ${author.name} selected`);
                }}
              />

              {selectedAuthors.length > 0 && (
                <>
                  <Action.CopyToClipboard
                    onCopy={async () => await popToRoot()}
                    content={selectedAuthors
                      .map((selectedAuthor) => `Co-authored-by: ${selectedAuthor.name} <${selectedAuthor.email}>`)
                      .join("\n")}
                  />
                  <Action.Paste
                    onPaste={async () => await popToRoot()}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "enter" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
                    }}
                    content={selectedAuthors
                      .map((selectedAuthor) => `Co-authored-by: ${selectedAuthor.name} <${selectedAuthor.email}>`)
                      .join("\n")}
                  />
                </>
              )}

              <Action.Push
                title="Add New Author"
                shortcut={{ macOS: { modifiers: ["cmd"], key: "n" }, Windows: { modifiers: ["ctrl"], key: "n" } }}
                target={<AddOrEditAuthor />}
                icon={Icon.AddPerson}
              />

              <Action.Push
                title={`Edit ${author.name}`}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "e" }, Windows: { modifiers: ["ctrl"], key: "e" } }}
                target={<AddOrEditAuthor author={author} />}
                icon={Icon.Pencil}
              />
              <Action
                title={`Remove ${author.name}`}
                icon={Icon.RemovePerson}
                style={Action.Style.Destructive}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "backspace" },
                  Windows: { modifiers: ["ctrl"], key: "backspace" },
                }}
                onAction={async () => {
                  await confirmAlert({
                    title: "Remove Author",
                    message: `Are you sure you want to remove ${author.name}?`,
                    icon: { source: Icon.RemovePerson, tintColor: Color.Red },
                    primaryAction: {
                      title: "Remove",
                      style: Alert.ActionStyle.Destructive,
                      onAction: async () => {
                        removeAuthorFromCache(author.email);
                        await showToast(Toast.Style.Success, `Removed ${author.name}`);
                        setSelectedAuthors(selectedAuthors.filter((a) => a.email !== author.email));
                      },
                    },
                  });
                }}
              />
              <Action
                title="Clear Authors"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{
                  macOS: { modifiers: ["cmd", "opt"], key: "backspace" },
                  Windows: { modifiers: ["ctrl", "alt"], key: "backspace" },
                }}
                onAction={async () => {
                  await confirmAlert({
                    title: "Clear All Authors",
                    message: `Are you sure you want to clear all co-authors?`,
                    icon: { source: Icon.ClearFormatting, tintColor: Color.Red },
                    primaryAction: {
                      title: "Clear",
                      style: Alert.ActionStyle.Destructive,
                      onAction: async () => {
                        sortedData.forEach((item) => resetRanking(item));
                        clearAuthorsCache();
                        await popToRoot();
                        await showToast(Toast.Style.Success, `Authors Cleared`);
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
