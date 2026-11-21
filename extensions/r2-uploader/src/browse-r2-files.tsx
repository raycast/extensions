import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { createR2Client } from "./utils/r2-client";
import { formatPublicLinks, getPublicBaseUrl } from "./utils/r2-url";
import {
  deleteR2Object,
  deleteR2Objects,
  listAllKeysUnderPrefix,
  FileEntry,
  FolderEntry,
  listR2Entries,
  formatBytes,
} from "./utils/r2-objects";
import { getMimeType, isImageMimeType } from "./utils/mime-types";
import { getPreviewUrl } from "./utils/r2-preview";

function FilePreviewDetail({ fileKey }: { fileKey: string }) {
  const contentType = getMimeType(fileKey);
  const { data: previewUrl, isLoading } = usePromise(getPreviewUrl, [fileKey]);

  const markdown = isLoading
    ? "Loading preview…"
    : isImageMimeType(contentType) && previewUrl
      ? `![](${previewUrl})`
      : `# ${fileKey.split("/").pop()}\n\nNo inline preview available for this file type.`;

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Key" text={fileKey} />
          <List.Item.Detail.Metadata.Label title="Content Type" text={contentType} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function FolderView({ prefix }: { prefix: string }) {
  const { push } = useNavigation();
  const { customDomain } = createR2Client();
  const { data, isLoading, revalidate } = usePromise(listR2Entries, [prefix]);
  const entries = data?.entries ?? [];

  async function copyLink(entry: FileEntry, format: "url" | "markdown" | "html") {
    let publicBaseUrl: string;
    try {
      publicBaseUrl = getPublicBaseUrl(customDomain);
    } catch (error) {
      await showFailureToast(error, {
        title: "Public Base URL required",
        primaryAction: { title: "Open Preferences", onAction: openExtensionPreferences },
      });
      return;
    }
    await Clipboard.copy(formatPublicLinks(entry.key, publicBaseUrl)[format]);
    await showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
  }

  async function handleDelete(entry: FileEntry) {
    const confirmed = await confirmAlert({
      title: `Delete "${entry.name}"?`,
      message: "This permanently deletes the file from your R2 bucket. This action cannot be undone.",
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteR2Object(entry.key);
      await showToast({ style: Toast.Style.Success, title: "File deleted" });
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete file" });
    }
  }

  async function handleDeleteFolder(entry: FolderEntry) {
    const countingToast = await showToast({ style: Toast.Style.Animated, title: "Counting files…" });

    let keys: string[];
    try {
      keys = await listAllKeysUnderPrefix(entry.prefix);
    } catch (error) {
      countingToast.style = Toast.Style.Failure;
      countingToast.title = "Failed to list folder contents";
      countingToast.message = error instanceof Error ? error.message : String(error);
      return;
    }

    if (keys.length === 0) {
      countingToast.style = Toast.Style.Success;
      countingToast.title = "Folder is empty";
      countingToast.message = "Nothing to delete";
      return;
    }
    await countingToast.hide();

    const fileWord = keys.length === 1 ? "file" : "files";
    const confirmed = await confirmAlert({
      title: `Delete "${entry.name}"?`,
      message: `This will permanently delete ${keys.length} ${fileWord} under "${entry.prefix}", including any subfolders. This action cannot be undone.`,
      icon: Icon.Trash,
      primaryAction: { title: `Delete ${keys.length} ${fileWord}`, style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteR2Objects(keys);
      await showToast({
        style: Toast.Style.Success,
        title: "Folder deleted",
        message: `${keys.length} ${fileWord} removed`,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete folder" });
    } finally {
      // Some files may have been deleted before a partial failure, so refresh either way.
      revalidate();
    }
  }

  return (
    <List
      isShowingDetail={entries.some((entry) => entry.type === "file")}
      isLoading={isLoading}
      navigationTitle={prefix ? `/${prefix}` : undefined}
      searchBarPlaceholder="Filter files and folders"
    >
      <List.EmptyView title="No files found" description="This folder is empty." icon={Icon.Folder} />
      {entries.map((entry) =>
        entry.type === "folder" ? (
          <List.Item
            key={entry.prefix}
            icon={Icon.Folder}
            title={entry.name}
            actions={
              <ActionPanel>
                <Action
                  title="Open Folder"
                  icon={Icon.ArrowRight}
                  onAction={() => push(<FolderView prefix={entry.prefix} />)}
                />
                <Action
                  title="Delete Folder"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDeleteFolder(entry)}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            key={entry.key}
            icon={Icon.Document}
            title={entry.name}
            subtitle={formatBytes(entry.size)}
            detail={<FilePreviewDetail fileKey={entry.key} />}
            actions={
              <ActionPanel>
                <Action title="Copy URL" icon={Icon.Link} onAction={() => copyLink(entry, "url")} />
                <Action
                  title="Copy Markdown"
                  icon={Icon.TextDocument}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                  onAction={() => copyLink(entry, "markdown")}
                />
                <Action title="Copy HTML" icon={Icon.Code} onAction={() => copyLink(entry, "html")} />
                <Action
                  title="Delete File"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(entry)}
                />
              </ActionPanel>
            }
          />
        ),
      )}
    </List>
  );
}

export default function Command() {
  return <FolderView prefix="" />;
}
