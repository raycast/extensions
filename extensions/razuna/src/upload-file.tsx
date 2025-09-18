import { ActionPanel, Action, List, showToast, Toast, Icon, Form, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { razunaAPI } from "./api";
import {
  getSelectedWorkspace,
  setSelectedWorkspace,
  getSelectedFolder,
  setSelectedFolder as persistSelectedFolder,
} from "./types";
import type { RazunaWorkspace, RazunaFolder } from "./types";
import WorkspaceSelector from "./workspace-selector";

export default function UploadFile() {
  const [selectedWorkspace, setSelectedWorkspaceState] = useState<RazunaWorkspace | null>(null);
  const [folders, setFolders] = useState<RazunaFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const { push } = useNavigation();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      loadFolders();
    }
  }, [selectedWorkspace]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load current selections
      const [currentWorkspace, currentFolder] = await Promise.all([getSelectedWorkspace(), getSelectedFolder()]);

      if (currentWorkspace) {
        setSelectedWorkspaceState(currentWorkspace);
      }

      if (currentFolder) {
        setSelectedFolder(currentFolder);
      }
    } catch (err) {
      showToast(Toast.Style.Failure, "Failed to load data", (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFolders = async () => {
    if (!selectedWorkspace) return;

    try {
      const foldersData = await razunaAPI.getFolders(selectedWorkspace._id);
      setFolders(foldersData);
    } catch (err) {
      showToast(Toast.Style.Failure, "Failed to load folders", (err as Error).message);
    }
  };

  const handleFolderChange = async (folderId: string) => {
    setSelectedFolder(folderId);
    await persistSelectedFolder(folderId);
  };

  const canUpload = selectedWorkspace && selectedFolder;

  const showUploadForm = () => {
    if (!canUpload) {
      showToast(Toast.Style.Failure, "Please select both workspace and folder");
      return;
    }

    push(
      <UploadForm
        workspace={selectedWorkspace}
        folderId={selectedFolder}
        onUploadComplete={() => {
          showToast(Toast.Style.Success, "File uploaded successfully!");
        }}
      />,
    );
  };

  const handleWorkspaceSelected = async (workspace: RazunaWorkspace) => {
    setSelectedWorkspaceState(workspace);
    await setSelectedWorkspace(workspace);
    // Reset folder selection when workspace changes
    setSelectedFolder("");
    await persistSelectedFolder(null);
  };

  const renderFolderDropdown = () => {
    if (!selectedWorkspace || folders.length === 0) return null;

    return (
      <List.Dropdown
        tooltip="Select Folder"
        storeValue={true}
        onChange={handleFolderChange}
        value={selectedFolder}
        placeholder="Choose folder..."
      >
        {folders.map((folder) => (
          <List.Dropdown.Item
            key={folder._id}
            title={folder.path || folder.name}
            value={folder._id}
            icon={Icon.Folder}
          />
        ))}
      </List.Dropdown>
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Upload files to your Razuna workspace..."
      searchBarAccessory={renderFolderDropdown()}
    >
      {!selectedWorkspace && (
        <List.EmptyView
          title="No Workspace Selected"
          description="Please select a workspace from the dropdown above"
          icon={Icon.Globe}
        />
      )}

      {selectedWorkspace && !selectedFolder && (
        <List.EmptyView
          title="No Folder Selected"
          description="Please select a folder from the dropdown above"
          icon={Icon.Folder}
        />
      )}

      {canUpload && (
        <List.Section title="Upload">
          <List.Item
            title="Upload Files"
            subtitle={`Upload to ${selectedWorkspace.name} → ${folders.find((f) => f._id === selectedFolder)?.path || "Selected Folder"}`}
            icon={Icon.Upload}
            actions={
              <ActionPanel>
                <Action title="Choose Files to Upload" onAction={showUploadForm} icon={Icon.Upload} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {selectedWorkspace && (
        <List.Section title="Quick Actions">
          <List.Item
            title="Switch Workspace"
            subtitle="Choose a different workspace"
            icon={Icon.Globe}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Select Workspace"
                  target={<WorkspaceSelector onWorkspaceSelected={handleWorkspaceSelected} showSwitchOption={true} />}
                  icon={Icon.Globe}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function UploadForm({
  workspace,
  folderId,
  onUploadComplete,
}: {
  workspace: RazunaWorkspace;
  folderId: string;
  onUploadComplete: () => void;
}) {
  const { pop } = useNavigation();
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (values: { filePath: string[] }) => {
    if (!values.filePath || values.filePath.length === 0) {
      showToast(Toast.Style.Failure, "Please select a file to upload");
      return;
    }

    try {
      setIsUploading(true);

      for (const filePath of values.filePath) {
        await razunaAPI.uploadFile(filePath, workspace._id, folderId, workspace);
      }

      showToast(Toast.Style.Success, "File(s) uploaded successfully!");
      onUploadComplete();
      pop();
    } catch (err) {
      showToast(Toast.Style.Failure, "Upload failed", (err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Form
      isLoading={isUploading}
      navigationTitle={`Upload to ${workspace.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload File" onSubmit={handleSubmit} icon={Icon.Upload} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="filePath"
        title="Select Files"
        allowMultipleSelection={true}
        canChooseDirectories={false}
        canChooseFiles={true}
      />

      <Form.Description text={`Files will be uploaded to the "${workspace.name}" workspace in the selected folder.`} />
    </Form>
  );
}
