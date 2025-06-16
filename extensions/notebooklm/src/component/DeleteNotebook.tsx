import { useState } from "react";
import { Action, ActionPanel, Alert, Color, Icon, List, useNavigation, confirmAlert } from "@raycast/api";
import { Notebook, Ownership } from "../types";
import { NotebookService } from "../services";

export function DeleteNotebook({ notebookService }: { notebookService: NotebookService }) {
  const [selectedNotebooks, setSelectedNotebooks] = useState<string[]>([]);
  const { pop } = useNavigation();

  const toggleNotebookSelection = (notebookId: string) => {
    setSelectedNotebooks((prev) => {
      if (prev.includes(notebookId)) {
        return prev.filter((id) => id !== notebookId);
      } else {
        return [...prev, notebookId];
      }
    });
  };

  return (
    <List navigationTitle="Delete Notebooks">
      {notebookService.notebooks.map((notebook: Notebook) => (
        <List.Item
          key={notebook.id}
          icon={
            selectedNotebooks.includes(notebook.id) ? { source: Icon.Checkmark, tintColor: Color.Red } : notebook.icon
          }
          title={notebook.title || "Untitled Notebook"}
          accessories={[
            notebook.shared
              ? notebook.owned === Ownership.Viewer
                ? {
                    icon: Icon.Eye,
                    tooltip: Ownership[notebook.owned],
                  }
                : {
                    icon: Icon.TwoPeople,
                    tooltip: Ownership[notebook.owned],
                  }
              : {},
            { tag: `+ ${notebook.sources?.length || 0}` },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={selectedNotebooks.includes(notebook.id) ? "Deselect Notebook" : "Select Notebook"}
                icon={Icon.Checkmark}
                onAction={() => toggleNotebookSelection(notebook.id)}
              />
              <Action
                title="Delete Selected Notebooks"
                icon={Icon.Trash}
                onAction={async () => {
                  if (selectedNotebooks.length > 0) {
                    await confirmAlert({
                      title: "Delete Notebooks",
                      message: "Are you sure you want to delete the selected notebooks?",
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                        onAction: async () => {
                          notebookService.delNotebooks(selectedNotebooks);
                          pop();
                        },
                      },
                    });
                  }
                }}
              />
              <Action
                title={selectedNotebooks.length !== notebookService.notebooks.length ? "Select All" : "Deselect All"}
                icon={Icon.Checkmark}
                onAction={() => {
                  if (selectedNotebooks.length === notebookService.notebooks.length) {
                    setSelectedNotebooks([]);
                  } else {
                    setSelectedNotebooks(notebookService.notebooks.map((notebook) => notebook.id));
                  }
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
