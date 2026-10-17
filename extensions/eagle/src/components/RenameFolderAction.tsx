import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { renameFolder } from "../utils/api";
import type { Folder } from "../@types/eagle";

interface RenameFolderActionProps {
  folder: Folder;
  onRenamed?: () => void;
}

function RenameFolderForm({ folder, onRenamed }: RenameFolderActionProps) {
  const [newName, setNewName] = useState(folder.name);
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    const trimmedNewName = newName.trim();
    const trimmedCurrentName = folder.name.trim();

    if (!trimmedNewName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Folder name is required",
      });
      return;
    }

    if (trimmedNewName === trimmedCurrentName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No changes made",
        message: "New name is the same as current name",
      });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Renaming folder...",
      });

      await renameFolder({
        folderId: folder.id,
        newName: trimmedNewName,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Folder renamed",
        message: `${folder.name} → ${trimmedNewName}`,
      });

      if (onRenamed) {
        onRenamed();
      }

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to rename folder",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Folder" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newName"
        title="New Name"
        placeholder="Enter new folder name"
        value={newName}
        onChange={setNewName}
      />
      <Form.Description title="Current Name" text={folder.name} />
    </Form>
  );
}

export function RenameFolderAction({ folder, onRenamed }: RenameFolderActionProps) {
  return (
    <Action.Push
      title="Rename Folder"
      icon={Icon.Pencil}
      target={<RenameFolderForm folder={folder} onRenamed={onRenamed} />}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}
