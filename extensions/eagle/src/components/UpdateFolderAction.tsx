import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation, Color } from "@raycast/api";
import { useState } from "react";
import { updateFolder } from "../utils/api";
import type { Folder } from "../@types/eagle";

interface UpdateFolderActionProps {
  folder: Folder;
  onUpdated?: () => void;
}

function UpdateFolderForm({ folder, onUpdated }: UpdateFolderActionProps) {
  const [newName, setNewName] = useState(folder.name);
  const [newDescription, setNewDescription] = useState(folder.description || "");
  const [newColor, setNewColor] = useState<
    "red" | "orange" | "green" | "yellow" | "aqua" | "blue" | "purple" | "pink" | ""
  >("");
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Updating folder...",
      });

      await updateFolder({
        folderId: folder.id,
        newName: newName !== folder.name ? newName : undefined,
        newDescription: newDescription !== (folder.description || "") ? newDescription : undefined,
        newColor: newColor !== "" ? newColor : undefined,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Folder updated",
      });

      if (onUpdated) {
        onUpdated();
      }

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update folder",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Folder" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="newName" title="Name" placeholder="Enter folder name" value={newName} onChange={setNewName} />
      <Form.TextArea
        id="newDescription"
        title="Description"
        placeholder="Enter folder description (optional)"
        value={newDescription}
        onChange={setNewDescription}
      />
      <Form.Dropdown
        id="newColor"
        title="Color (Optional)"
        value={newColor}
        onChange={(value) => setNewColor(value as typeof newColor)}
      >
        <Form.Dropdown.Item value="" title="No Change" />
        <Form.Dropdown.Item value="red" title="🔴 Red" icon={{ source: Icon.Circle, tintColor: Color.Red }} />
        <Form.Dropdown.Item value="orange" title="🟠 Orange" icon={{ source: Icon.Circle, tintColor: Color.Orange }} />
        <Form.Dropdown.Item value="yellow" title="🟡 Yellow" icon={{ source: Icon.Circle, tintColor: Color.Yellow }} />
        <Form.Dropdown.Item value="green" title="🟢 Green" icon={{ source: Icon.Circle, tintColor: Color.Green }} />
        <Form.Dropdown.Item value="aqua" title="🔵 Aqua" icon={{ source: Icon.Circle, tintColor: Color.Blue }} />
        <Form.Dropdown.Item value="blue" title="🔵 Blue" icon={{ source: Icon.Circle, tintColor: Color.Blue }} />
        <Form.Dropdown.Item value="purple" title="🟣 Purple" icon={{ source: Icon.Circle, tintColor: Color.Purple }} />
        <Form.Dropdown.Item value="pink" title="🩷 Pink" icon={{ source: Icon.Circle, tintColor: Color.Magenta }} />
      </Form.Dropdown>
      <Form.Description title="Current Name" text={folder.name} />
      {folder.description && <Form.Description title="Current Description" text={folder.description} />}
    </Form>
  );
}

export function UpdateFolderAction({ folder, onUpdated }: UpdateFolderActionProps) {
  return (
    <Action.Push
      title="Update Folder Properties"
      icon={Icon.Gear}
      target={<UpdateFolderForm folder={folder} onUpdated={onUpdated} />}
      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
    />
  );
}
