import { ActionPanel, Action, Grid, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { usePromise } from "@raycast/utils";
import { razunaAPI } from "./api";
import { formatFileSize, getSelectedWorkspace } from "./types";
import type { RazunaWorkspace, RazunaFile } from "./types";
import WorkspaceSelector from "./workspace-selector";
import { getFileIcon, getFileViewUrl } from "./utils";
import FileDetail from "./components/FileDetail";

export default function SearchFiles() {
  const [selectedWorkspace, setSelectedWorkspaceState] = useState<RazunaWorkspace | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { push } = useNavigation();

  // Use usePromise with built-in pagination support
  const { isLoading, data, pagination } = usePromise(
    (searchText: string, workspaceId: string) => async (options: { page: number }) => {
      if (!searchText.trim() || searchText.length < 3) {
        return { data: [], hasMore: false };
      }

      if (!workspaceId) {
        throw new Error("No workspace selected");
      }

      const result = await razunaAPI.searchFiles(searchText, workspaceId, options.page + 1, 25);

      return {
        data: result.files,
        hasMore: (options.page + 1) * 25 < result.total,
      };
    },
    [searchQuery, selectedWorkspace?._id || ""],
    {
      execute: searchQuery.length >= 3 && !!selectedWorkspace,
    },
  );

  // Helper function to get file content for grid display
  const getFileContent = (file: RazunaFile): Grid.Item.Props["content"] => {
    // Get the thumbnail URL from either direct_links or urls
    const thumbnailUrl = file.direct_links?.url_tl || file.urls?.url_tl;

    // If it's an image and has thumbnail, show the thumbnail
    if (file.content_type_family === "image" && thumbnailUrl) {
      return {
        source: thumbnailUrl,
        fallback: getFileIcon(file.extension),
      };
    }

    // For non-images or files without thumbnails, show appropriate icon
    return {
      source: getFileIcon(file.extension),
    };
  };

  const showFileDetail = (file: RazunaFile) => {
    push(<FileDetail file={file} />);
  };

  useEffect(() => {
    checkWorkspaceSelection();
  }, []);

  const checkWorkspaceSelection = async () => {
    try {
      const workspace = await getSelectedWorkspace();

      if (workspace) {
        setSelectedWorkspaceState(workspace);
      } else {
        // No workspace selected, show selector
        showWorkspaceSelector();
      }
    } catch (err) {
      showToast(Toast.Style.Failure, "Failed to check workspace selection", (err as Error).message);
    }
  };

  const showWorkspaceSelector = () => {
    push(<WorkspaceSelector onWorkspaceSelected={handleWorkspaceSelected} showSwitchOption={!!selectedWorkspace} />);
  };

  const handleWorkspaceSelected = (workspace: RazunaWorkspace) => {
    setSelectedWorkspaceState(workspace);
  };

  // If no workspace is selected, show empty state with action to select
  if (!selectedWorkspace) {
    return (
      <Grid>
        <Grid.EmptyView
          title="No Workspace Selected"
          description="Please select a workspace to search files"
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

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder={`Search files in ${selectedWorkspace.name} (minimum 3 characters)...`}
      onSearchTextChange={setSearchQuery}
      navigationTitle={selectedWorkspace?.name || "Search Files"}
      columns={5}
      fit={Grid.Fit.Fill}
      aspectRatio="3/2"
      pagination={pagination}
    >
      {searchQuery.length === 0 && (
        <Grid.EmptyView
          title="Search for files"
          description={`Enter at least 3 characters to search files in ${selectedWorkspace.name}`}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Switch Workspace" onAction={showWorkspaceSelector} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      )}

      {searchQuery.length > 0 && searchQuery.length < 3 && (
        <Grid.EmptyView
          title="Type at least 3 characters"
          description={`Need more characters to search in ${selectedWorkspace.name}`}
          icon={Icon.MagnifyingGlass}
        />
      )}

      {searchQuery.length >= 3 && data && data.length === 0 && !isLoading && (
        <Grid.EmptyView
          title="No files found"
          description={`No results for "${searchQuery}" in ${selectedWorkspace.name}`}
          icon={Icon.MagnifyingGlass}
        />
      )}

      {/* Display search results */}
      {data?.map((file: RazunaFile) => (
        <Grid.Item
          key={file._id}
          id={file._id}
          content={getFileContent(file)}
          title={file.name || file.file_name || file.original_name || "Untitled"}
          subtitle={`${file.size_human || formatFileSize(file.size)} • ${file.extension.toUpperCase()}`}
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
