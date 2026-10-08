import { ActionPanel, Action, Grid, showToast, Toast, Icon, Detail, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { usePromise } from "@raycast/utils";
import { razunaAPI } from "./api";
import { getSelectedWorkspace, setSelectedWorkspace, getSelectedFolder, setSelectedFolder } from "./types";
import type { RazunaWorkspace, RazunaFolder, RazunaFile } from "./types";
import WorkspaceSelector from "./workspace-selector";
import { getFileIcon, getFileViewUrl } from "./utils";
import FileDetail from "./components/FileDetail";

export default function BrowseFiles() {
  const [selectedWorkspace, setSelectedWorkspaceState] = useState<RazunaWorkspace | null>(null);
  const [selectedFolder, setSelectedFolderState] = useState<string>("");
  const [folders, setFolders] = useState<RazunaFolder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { push } = useNavigation();

  // Use proper Raycast pagination for folder content
  const {
    data: folderFiles,
    isLoading,
    pagination,
    revalidate,
  } = usePromise(
    (workspaceId: string, folderId?: string) => async (options: { page: number }) => {
      const result = await razunaAPI.getFolderContent(workspaceId, folderId, options.page + 1, 25);

      return {
        data: result.files || [],
        hasMore: (result.files?.length || 0) === 25,
      };
    },
    [selectedWorkspace?._id || "", selectedFolder || undefined],
    {
      execute: !!selectedWorkspace,
    },
  );

  useEffect(() => {
    checkWorkspaceSelection();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      loadFolders();
      revalidate();
    }
  }, [selectedWorkspace, selectedFolder]);

  const checkWorkspaceSelection = async () => {
    try {
      const workspace = await getSelectedWorkspace();
      const folder = await getSelectedFolder();

      if (workspace) {
        setSelectedWorkspaceState(workspace);
        setSelectedFolderState(folder || "");
      } else {
        // No workspace selected, show selector
        showWorkspaceSelector();
      }
    } catch (err) {
      setError((err as Error).message);
      showToast(Toast.Style.Failure, "Failed to check workspace selection", (err as Error).message);
    }
  };

  const loadFolders = async () => {
    if (!selectedWorkspace) return;

    try {
      const folderData = await razunaAPI.getFolders(selectedWorkspace._id);
      setFolders(folderData);
    } catch (err) {
      showToast(Toast.Style.Failure, "Failed to load folders", (err as Error).message);
    }
  };

  const showWorkspaceSelector = () => {
    push(<WorkspaceSelector onWorkspaceSelected={handleWorkspaceSelected} showSwitchOption={!!selectedWorkspace} />);
  };

  const handleWorkspaceSelected = async (workspace: RazunaWorkspace) => {
    setSelectedWorkspaceState(workspace);
    await setSelectedWorkspace(workspace);
    setSelectedFolderState("");
    await setSelectedFolder(null);
  };

  const handleFolderChange = async (folderId: string) => {
    setSelectedFolderState(folderId);
    await setSelectedFolder(folderId);
  };

  const renderFolderDropdown = () => {
    if (!selectedWorkspace || folders.length === 0) return null;

    return (
      <Grid.Dropdown
        tooltip="Select Folder"
        storeValue={true}
        onChange={handleFolderChange}
        value={selectedFolder}
        placeholder="All folders (root)"
      >
        <Grid.Dropdown.Item key="root" title="All folders (root)" value="" icon={Icon.House} />
        {folders.map((folder) => (
          <Grid.Dropdown.Item
            key={folder._id}
            title={folder.path || folder.name}
            value={folder._id}
            icon={Icon.Folder}
          />
        ))}
      </Grid.Dropdown>
    );
  };

  const showFileDetail = (file: RazunaFile) => {
    push(<FileDetail file={file} />);
  };

  const getFileContent = (file: RazunaFile): Grid.Item.Props["content"] => {
    // If it's an image and has thumbnail, show the thumbnail
    if (file.content_type_family === "image" && file.direct_links?.url_tl) {
      return {
        source: file.direct_links.url_tl,
        fallback: getFileIcon(file.extension),
      };
    }

    // For non-images or files without thumbnails, show appropriate icon
    return {
      source: getFileIcon(file.extension),
    };
  };

  // If no workspace is selected, show empty state with action to select
  if (!selectedWorkspace && !isLoading) {
    return (
      <Grid>
        <Grid.EmptyView
          title="No Workspace Selected"
          description="Please select a workspace to browse files"
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action title="Select Workspace" onAction={showWorkspaceSelector} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}\n\nPlease check your server URL and access token in the extension preferences.`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={checkWorkspaceSelection} />
            <Action title="Select Different Workspace" onAction={showWorkspaceSelector} />
          </ActionPanel>
        }
      />
    );
  }

  // Show grid of files with thumbnails
  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Browse files and folders..."
      searchBarAccessory={renderFolderDropdown()}
      navigationTitle={selectedWorkspace?.name || "Browse Files"}
      columns={5}
      fit={Grid.Fit.Fill}
      aspectRatio="3/2"
      pagination={pagination}
    >
      {/* Show empty state when no files are found */}
      {selectedWorkspace && folderFiles && folderFiles.length === 0 && (
        <Grid.EmptyView
          title="No Files Found"
          description={selectedFolder ? `No files in the selected folder` : `No files in the root folder`}
          icon={Icon.Document}
        />
      )}

      {/* Display files from current folder/workspace */}
      {folderFiles?.map((file: RazunaFile) => (
        <Grid.Item
          key={file._id}
          id={file._id}
          content={getFileContent(file)}
          title={file.name || file.file_name || file.original_name || "Untitled"}
          subtitle={`${file.size_human} • ${file.extension.toUpperCase()}`}
          actions={
            <ActionPanel>
              <Action title="View Details" onAction={() => showFileDetail(file)} icon={Icon.Eye} />
              {getFileViewUrl(file) && (
                <Action.OpenInBrowser title="Open in Browser" url={getFileViewUrl(file)!} icon={Icon.Globe} />
              )}
              {file.direct_links?.url_dl && (
                <Action.OpenInBrowser title="Download File" url={file.direct_links.url_dl} icon={Icon.Download} />
              )}
              <Action.CopyToClipboard
                title="Copy File Name"
                content={file.name || file.file_name || file.original_name || "Untitled"}
                icon={Icon.Clipboard}
              />
              <Action.CopyToClipboard
                title="Copy File URL"
                content={file.direct_links?.url || "No URL available"}
                icon={Icon.Link}
              />
              <Action title="Switch Workspace" onAction={showWorkspaceSelector} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
