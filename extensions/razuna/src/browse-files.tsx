import { ActionPanel, Action, Grid, showToast, Toast, Icon, Detail, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { usePromise } from "@raycast/utils";
import { razunaAPI } from "./api";
import {
  formatFileSize,
  formatDate,
  getSelectedWorkspace,
  setSelectedWorkspace,
  getSelectedFolder,
  setSelectedFolder,
  getPreferences,
} from "./types";
import type { RazunaWorkspace, RazunaFolder, RazunaFile } from "./types";
import WorkspaceSelector from "./workspace-selector";

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
      console.log("=== LOADING FOLDER CONTENT ===");
      console.log("Workspace ID:", workspaceId);
      console.log("Folder ID:", folderId);
      console.log("Page:", options.page + 1); // usePromise uses 0-indexed pages, but our API uses 1-indexed

      const result = await razunaAPI.getFolderContent(workspaceId, folderId, options.page + 1, 25);

      console.log(`Received ${result?.files?.length || 0} files for page ${options.page + 1}`);
      console.log("=== END FOLDER DATA DEBUG ===");

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

  // Helper function to build file view URL
  const getFileViewUrl = (file: RazunaFile): string | null => {
    if (!file.short_id) return null;
    const { server_url } = getPreferences();
    const baseUrl = server_url.startsWith("http") ? server_url : `https://${server_url}`;
    return `${baseUrl}/files/go/${file.short_id}`;
  };

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
      console.error("Failed to load folders:", err);
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

function FileDetail({ file }: { file: RazunaFile }) {
  // Use timestamp_display for better formatted dates, fallback to other date fields
  const displayDate =
    file.timestamp_display || formatDate(file.audit_info?.created_date || file.created_at || "Unknown");

  // Build the file viewer URL using short_id
  const getFileViewUrl = (file: RazunaFile): string | null => {
    if (!file.short_id) return null;
    const { server_url } = getPreferences();
    const baseUrl = server_url.startsWith("http") ? server_url : `https://${server_url}`;
    return `${baseUrl}/files/go/${file.short_id}`;
  };

  const fileViewUrl = getFileViewUrl(file);

  // Build AI-detected content sections
  const buildAISection = () => {
    const sections = [];

    if (file.objects && file.objects.length > 0) {
      sections.push(`**Objects Detected:** ${file.objects.join(", ")}`);
    }

    if (file.people && file.people.length > 0) {
      const peopleInfo = file.people
        .map(
          (person) =>
            `${person.gender} (${person.age_range}), ${person.ethnicity}, ${person.hair_color} hair, ${person.eye_color} eyes`,
        )
        .join("; ");
      sections.push(`**People Detected:** ${peopleInfo}`);
    }

    if (file.people_gender && file.people_gender.length > 0) {
      sections.push(`**Gender:** ${file.people_gender.join(", ")}`);
    }

    if (file.people_age_range && file.people_age_range.length > 0) {
      sections.push(`**Age Range:** ${file.people_age_range.join(", ")}`);
    }

    if (file.people_ethnicity && file.people_ethnicity.length > 0) {
      sections.push(`**Ethnicity:** ${file.people_ethnicity.join(", ")}`);
    }

    return sections.length > 0 ? `\n\n## 🤖 AI Analysis\n\n${sections.join("\n\n")}` : "";
  };

  const buildTagsSection = () => {
    const sections = [];

    if (file.keywords && file.keywords.length > 0) {
      sections.push(`**Keywords:** ${file.keywords.join(", ")}`);
    }

    if (file.labels_names && file.labels_names.length > 0) {
      sections.push(`**Tags:** ${file.labels_names.join(", ")}`);
    }

    return sections.length > 0 ? `\n\n## 🏷️ Tags & Keywords\n\n${sections.join("\n\n")}` : "";
  };

  // Get the best available filename
  const fileName = file.name || file.file_name || file.original_name || "Untitled";

  // Get the best available thumbnail (400x400 should be url_tl)
  const thumbnailUrl = file.direct_links?.url_tl || file.direct_links?.url_t || file.direct_links?.url;

  const markdown = `
${thumbnailUrl ? `![${fileName}](${thumbnailUrl})` : ""}

# ${fileName}

${file.description ? `*${file.description}*\n` : ""}## 📄 File Information

**Filename:** ${file.original_name || file.file_name}
**File Size:** ${file.size_human || formatFileSize(file.size)}
**File Type:** ${file.content_type}
**Extension:** ${file.extension.toUpperCase()}
${file.pixels ? `**Dimensions:** ${file.pixels}` : ""}
**Created:** ${displayDate}
**Modified:** ${displayDate}
${file.checksum ? `**Checksum:** \`${file.checksum}\`` : ""}

${buildTagsSection()}

${buildAISection()}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="File Name" text={fileName} />
          <Detail.Metadata.Label title="Size" text={file.size_human || formatFileSize(file.size)} />
          {file.pixels && <Detail.Metadata.Label title="Dimensions" text={file.pixels} />}
          <Detail.Metadata.Label title="Type" text={file.content_type} />
          <Detail.Metadata.Label title="Extension" text={file.extension.toUpperCase()} />

          {file.keywords && file.keywords.length > 0 && (
            <Detail.Metadata.TagList title="Keywords">
              {file.keywords.map((keyword, index) => (
                <Detail.Metadata.TagList.Item key={index} text={keyword} />
              ))}
            </Detail.Metadata.TagList>
          )}

          {file.labels_names && file.labels_names.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {file.labels_names.map((tag, index) => (
                <Detail.Metadata.TagList.Item key={index} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}

          {file.objects && file.objects.length > 0 && (
            <Detail.Metadata.TagList title="Objects">
              {file.objects.map((object, index) => (
                <Detail.Metadata.TagList.Item key={index} text={object} />
              ))}
            </Detail.Metadata.TagList>
          )}

          {file.people_gender && file.people_gender.length > 0 && (
            <Detail.Metadata.TagList title="People">
              {file.people_gender.map((gender, index) => (
                <Detail.Metadata.TagList.Item key={index} text={gender} />
              ))}
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={displayDate} />
          <Detail.Metadata.Label title="Modified" text={displayDate} />
          {file.checksum && <Detail.Metadata.Label title="Checksum" text={file.checksum} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {fileViewUrl && <Action.OpenInBrowser title="Open in Browser" url={fileViewUrl} icon={Icon.Globe} />}
          {file.direct_links?.url_dl && (
            <Action.OpenInBrowser title="Download File" url={file.direct_links.url_dl} icon={Icon.Download} />
          )}
          {file.direct_links?.url_tl && (
            <Action.OpenInBrowser title="View Large Thumbnail" url={file.direct_links.url_tl} icon={Icon.Image} />
          )}
          <Action.CopyToClipboard title="Copy File Name" content={file.name} icon={Icon.Clipboard} />
          <Action.CopyToClipboard title="Copy File Id" content={file._id} icon={Icon.Clipboard} />
          {file.direct_links?.url && (
            <Action.CopyToClipboard title="Copy File URL" content={file.direct_links.url} icon={Icon.Link} />
          )}
          {file.pixels && <Action.CopyToClipboard title="Copy Dimensions" content={file.pixels} icon={Icon.Ruler} />}
        </ActionPanel>
      }
    />
  );
}
function getFileIcon(extension: string): Icon {
  const ext = extension.toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext)) {
    return Icon.Image;
  }
  if (["pdf"].includes(ext)) {
    return Icon.Document;
  }
  if (["mp4", "avi", "mov", "wmv", "flv", "webm"].includes(ext)) {
    return Icon.Video;
  }
  if (["mp3", "wav", "flac", "aac", "ogg"].includes(ext)) {
    return Icon.Music;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return Icon.Box;
  }
  if (["txt", "md", "log"].includes(ext)) {
    return Icon.Text;
  }

  return Icon.Document;
}
