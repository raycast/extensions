import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { createFolder } from "../utils/api";

interface CreateFolderActionProps {
  parentFolderId?: string;
  onCreated?: () => void;
}

function CreateFolderForm({ parentFolderId, onCreated }: CreateFolderActionProps) {
  const [folderName, setFolderName] = useState("");
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    if (!folderName.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Folder name is required",
      });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating folder...",
      });

      await createFolder({
        folderName: folderName.trim(),
        parent: parentFolderId,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Folder created",
        message: folderName,
      });

      if (onCreated) {
        onCreated();
      }

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create folder",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Folder" icon={Icon.NewFolder} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="folderName"
        title="Folder Name"
        placeholder="Enter folder name"
        value={folderName}
        onChange={setFolderName}
      />
      {parentFolderId && <Form.Description title="Location" text={`This folder will be created as a subfolder`} />}
    </Form>
  );
}

export function CreateFolderAction({ parentFolderId, onCreated }: CreateFolderActionProps) {
  return (
    <Action.Push
      title="Create Folder"
      icon={Icon.NewFolder}
      target={<CreateFolderForm parentFolderId={parentFolderId} onCreated={onCreated} />}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );
}
