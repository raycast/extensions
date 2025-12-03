import { List, Action, ActionPanel, showToast, Toast, Clipboard } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { getSnippets, deleteSnippet } from "./utils/storage";
import { replaceTemplateVariables } from "./utils/template";
import { Snippet } from "./types";
import CreateSnippet from "./create-snippet";
import EditSnippet from "./edit-snippet";

export default function InsertSnippet() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSnippets();
  }, []);

  async function loadSnippets() {
    try {
      const data = await getSnippets();
      setSnippets(data);
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to load snippets");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleInsert(snippet: Snippet) {
    try {
      const content = await replaceTemplateVariables(snippet.content);
      await Clipboard.paste(content);
      await showToast(Toast.Style.Success, "Snippet Inserted", snippet.name);
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to insert snippet");
    }
  }

  async function handleDelete(snippet: Snippet) {
    try {
      await deleteSnippet(snippet.id);
      await loadSnippets();
      await showToast(Toast.Style.Success, "Snippet Deleted");
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to delete snippet");
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search snippets...">
      <List.Item
        title="➕ Create New Snippet"
        actions={
          <ActionPanel>
            <Action.Push title="Create Snippet" target={<CreateSnippet onCreated={loadSnippets} />} />
          </ActionPanel>
        }
      />
      {snippets.map((snippet) => (
        <List.Item
          key={snippet.id}
          title={snippet.name}
          subtitle={snippet.category || ""}
          accessories={snippet.tags ? [{ text: snippet.tags.join(", ") }] : []}
          actions={
            <ActionPanel>
              <Action title="Insert Snippet" onAction={() => handleInsert(snippet)} />
              <Action.Push title="Edit Snippet" target={<EditSnippet snippet={snippet} onUpdated={loadSnippets} />} />
              <Action
                title="Delete Snippet"
                onAction={() => handleDelete(snippet)}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
