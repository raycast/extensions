import { ActionPanel, Action, Grid, showToast, Toast, Icon, Detail, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { usePromise } from "@raycast/utils";
import { razunaAPI } from "./api";
import { formatFileSize, formatDate, getSelectedWorkspace, getPreferences } from "./types";
import type { RazunaWorkspace, RazunaFile } from "./types";
import WorkspaceSelector from "./workspace-selector";

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

  // Helper function to build file view URL
  const getFileViewUrl = (file: RazunaFile): string | null => {
    if (!file.short_id) return null;
    const { server_url } = getPreferences();
    const baseUrl = server_url.startsWith("http") ? server_url : `https://${server_url}`;
    return `${baseUrl}/files/go/${file.short_id}`;
  };

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
  const thumbnailUrl =
    file.direct_links?.url_tl ||
    file.urls?.url_tl ||
    file.direct_links?.url_t ||
    file.urls?.url_t ||
    file.direct_links?.url ||
    file.urls?.url;

  const markdown = `
${thumbnailUrl ? `![${fileName}](${thumbnailUrl})` : ""}

# ${fileName}

${file.description ? `*${file.description}*\n` : ""}## 📄 File Information

**Filename:** ${file.original_name || file.file_name}
**File Size:** ${file.size_human || formatFileSize(file.size)}
**File Type:** ${file.content_type}
**Extension:** ${file.extension.toUpperCase()}
${file.pixels ? `**Dimensions:** ${file.pixels}` : ""}
**Date:** ${displayDate}
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
          <Detail.Metadata.Label title="Date" text={displayDate} />
          {file.checksum && <Detail.Metadata.Label title="Checksum" text={file.checksum} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {fileViewUrl && <Action.OpenInBrowser title="Open in Browser" url={fileViewUrl} icon={Icon.Globe} />}
          {(file.direct_links?.url_dl || file.urls?.url_dl) && (
            <Action.OpenInBrowser
              title="Download File"
              url={file.direct_links?.url_dl || file.urls?.url_dl || ""}
              icon={Icon.Download}
            />
          )}
          {(file.direct_links?.url_tl || file.urls?.url_tl) && (
            <Action.OpenInBrowser
              title="View Large Thumbnail"
              url={file.direct_links?.url_tl || file.urls?.url_tl || ""}
              icon={Icon.Image}
            />
          )}
          <Action.CopyToClipboard title="Copy File Name" content={file.name} icon={Icon.Clipboard} />
          <Action.CopyToClipboard title="Copy File Id" content={file._id} icon={Icon.Clipboard} />
          {(file.direct_links?.url || file.urls?.url) && (
            <Action.CopyToClipboard
              title="Copy File URL"
              content={file.direct_links?.url || file.urls?.url || ""}
              icon={Icon.Link}
            />
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
