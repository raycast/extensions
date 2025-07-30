import { Form, ActionPanel, Action, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchFolders, createFolder } from "../services/graphql";
import { Folder } from "../types";
import { FolderForm } from "./FolderForm";

interface CreateCollectionFormProps {
  onSubmit: (name: string, description: string, isPrivate: boolean, folderId?: string) => void;
  initialName?: string;
}

export function CreateCollectionForm({ onSubmit, initialName = "" }: CreateCollectionFormProps) {
  const { pop, push } = useNavigation();
  const [isPrivate, setIsPrivate] = useState(true);
  const [nameError, setNameError] = useState<string | undefined>();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setIsLoading(true);
      const foldersData = await fetchFolders();
      setFolders(foldersData);
    } catch (error) {
      console.error("Error loading folders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      const newFolder = await createFolder({ name });
      setFolders([...folders, newFolder]);
      setSelectedFolderId(newFolder.folderId);
    } catch (error) {
      console.error("Error creating folder:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create folder",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const validateName = (name?: string) => {
    if (!name || name.trim() === "") {
      setNameError("The name is required");
      return false;
    }
    setNameError(undefined);
    return true;
  };

  const handleFolderChange = (value: string) => {
    if (value === "create-new") {
      push(<FolderForm onSubmit={handleCreateFolder} />);
    } else {
      setSelectedFolderId(value);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Collection"
            onSubmit={async () => {
              if (!validateName(name)) {
                return;
              }
              onSubmit(name.trim(), description.trim(), isPrivate, selectedFolderId || undefined);
              await pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new collection to organize your links" />

      <Form.TextField
        id="name"
        title="Collection name"
        placeholder="eg. Design Inspiration"
        value={name}
        autoFocus
        error={nameError}
        onChange={(newValue) => {
          setName(newValue);
          if (nameError) {
            validateName(newValue);
          }
        }}
        onBlur={() => validateName(name)}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description for your collection"
        value={description}
        onChange={setDescription}
      />

      <Form.Dropdown id="folder" title="Folder" value={selectedFolderId} onChange={handleFolderChange}>
        <Form.Dropdown.Item value="" title="No Folder" />
        <Form.Dropdown.Item value="create-new" title="Create New Folder..." icon={Icon.NewFolder} />
        {folders.length > 0 && (
          <Form.Dropdown.Section title="Existing Folders">
            {folders.map((folder) => (
              <Form.Dropdown.Item
                key={folder.folderId}
                value={folder.folderId}
                title={folder.name}
                icon={Icon.Folder}
              />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown
        id="visibility"
        title="Visibility"
        value={isPrivate ? "private" : "public"}
        onChange={(newValue) => setIsPrivate(newValue === "private")}
      >
        <Form.Dropdown.Section>
          <Form.Dropdown.Item value="private" title="Private" icon={Icon.Lock} />
          <Form.Dropdown.Item value="public" title="Public" icon={Icon.Globe} />
        </Form.Dropdown.Section>
      </Form.Dropdown>
    </Form>
  );
}
