import {
  List,
  ActionPanel,
  Action,
  Alert,
  Icon,
  Color,
  confirmAlert,
  showToast,
  Toast,
  openCommandPreferences,
} from "@raycast/api";
import { MarkdownFile } from "../types/markdownTypes";
import { openWithEditor, moveToTrash, checkEditorExists, getDefaultEditor } from "../utils/fileOperations";
import { isSystemTag, getSystemTag, sortTags, filterDisplayTags } from "../utils/tagOperations";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { showFailureToast } from "@raycast/utils";
import { formatDate } from "../utils/dateUtils";
import { getTagTintColor } from "../utils/tagColorUtils";
import { useState, useEffect } from "react";

interface FileListItemProps {
  file: MarkdownFile;
  showColorTags: boolean;
  setShowColorTags: (show: boolean) => void;
  revalidate: () => void;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  markdownDir: string;
  loadMoreFiles: () => void;
  showCreateFileForm: () => void;
  showTagSearchList: () => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
}

// Define the maximum display length (can be adjusted according to actual UI requirements)
const MAX_DISPLAY_LENGTH = 15;

// Define the maximum display length (can be adjusted according to actual UI requirements)
const getVisibleTags = (
  tags: string[] | undefined,
  maxDisplayLength: number,
): { visible: string[]; hiddenCount: number } => {
  // If tags is undefined, the default is an empty array.
  const safeTags = tags || [];

  const sortedTags = [...safeTags].sort((a, b) => a.length - b.length);

  // If even the shortest label exceeds the maximum display length, return "+N" directly
  if (sortedTags.length > 0 && sortedTags[0].length > maxDisplayLength) {
    return { visible: [], hiddenCount: sortedTags.length };
  }

  const visible: string[] = [];
  let currentLength = 0;

  // Show at least the shortest tag (if any)
  for (const tag of sortedTags) {
    const tagLength = tag.length;
    if (currentLength === 0 || currentLength + tagLength <= maxDisplayLength) {
      visible.push(tag);
      currentLength += tagLength;
    } else {
      break;
    }
  }

  const hiddenCount = safeTags.length - visible.length;
  return { visible, hiddenCount };
};

// Truncate labels (if necessary)
const truncateTag = (tag: string, maxLength: number): string => {
  if (tag.length <= maxLength) return tag;
  return `${tag.substring(0, maxLength - 1)}…`;
};

export function FileListItem({
  file,
  showColorTags,
  setShowColorTags,
  revalidate,
  currentPage,
  totalPages,
  setCurrentPage,
  markdownDir,
  loadMoreFiles,
  showCreateFileForm,
  showTagSearchList,
  selectedTag,
  setSelectedTag,
}: FileListItemProps) {
  // Confirm and delete file
  const confirmDelete = async () => {
    if (
      await confirmAlert({
        title: "Delete this file?",
        message: `Are you sure you want to delete "${file.name}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        fs.unlinkSync(file.path);
        showToast({
          style: Toast.Style.Success,
          title: "File deleted",
          message: `${file.name} has been deleted`,
        });
        revalidate();
      } catch (error) {
        showFailureToast({
          title: "Error deleting file",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  // Move file to trash using Raycast's trash API
  const handleMoveToTrash = async () => {
    try {
      const success = await moveToTrash(file.path);
      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: "File moved to trash",
          message: `${file.name} has been moved to trash`,
        });
        revalidate();
      } else {
        throw new Error("Failed to move file to trash");
      }
    } catch (error) {
      showFailureToast({
        title: "Error moving file to trash",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Get the relative path from the markdownDir
  const getRelativePath = () => {
    if (!markdownDir) return file.path;
    try {
      return path.relative(markdownDir, file.path);
    } catch (error) {
      return file.path;
    }
  };

  // Pagination actions
  const paginationActions = (
    <>
      {currentPage > 0 && (
        <Action
          title="Previous Page"
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          onAction={() => setCurrentPage(currentPage - 1)}
        />
      )}
      {currentPage < totalPages - 1 && (
        <Action
          title="Next Page"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          onAction={() => setCurrentPage(currentPage + 1)}
        />
      )}
    </>
  );

  // Check if the default editor exists
  const defaultEditor = getDefaultEditor();
  const [editorExists, setEditorExists] = useState<boolean>(false);

  useEffect(() => {
    async function checkEditor() {
      const exists = await checkEditorExists(defaultEditor);
      setEditorExists(exists);
    }
    checkEditor();
  }, [defaultEditor]);

  // Filter tags before sorting and rendering
  const filteredTags = filterDisplayTags(file.tags, showColorTags) || [];
  //console.log(`Filtered tags for ${file.name}:`, filteredTags); // Log filtered tags

  // Sort tags with system tags first
  const sortedTags = sortTags(filteredTags);

  // Get visible tags dynamically
  const { visible, hiddenCount } = getVisibleTags(sortedTags, MAX_DISPLAY_LENGTH);

  //console.log(`Rendering tags for ${file.name}:`, visible); // Log tags being rendered

  // Create a Date object from the timestamp for the tooltip
  const lastModifiedDate = new Date(file.lastModified);

  return (
    <List.Item
      id={file.path}
      title={file.name}
      subtitle={getRelativePath()}
      accessories={[
        {
          text: formatDate(file.lastModified),
          tooltip: `Last modified: ${lastModifiedDate.toLocaleString()}`,
        },
        ...visible
          .filter((tag) => tag && typeof tag === "string" && tag.length > 0)
          .map((tag) => {
            const systemTag = getSystemTag(tag);
            const isSystem = isSystemTag(tag);

            // Truncate tag if necessary
            const truncatedTag = truncateTag(tag, MAX_DISPLAY_LENGTH);

            return {
              tag: {
                value: truncatedTag,
                tooltip: tag, // Show full tag on hover
                color: showColorTags && isSystem ? getTagTintColor(isSystem, systemTag) : undefined,
              },
            };
          }),
        ...(hiddenCount > 0
          ? [
              {
                tag: {
                  value: `+${hiddenCount}`,
                  color: Color.SecondaryText,
                },
                tooltip: `${hiddenCount} more tags: ${sortedTags.slice(visible.length).join(", ")}`,
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {editorExists && (
              <Action title="Open with Editor" icon={Icon.BlankDocument} onAction={() => openWithEditor(file.path)} />
            )}
            {!editorExists && (
              <Action
                title="Set Default Editor"
                icon={Icon.Gear}
                onAction={openCommandPreferences}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
              />
            )}
            <Action
              title="Open in Default App"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => {
                exec(`open "${file.path}"`);
              }}
            />
            <Action.OpenWith path={file.path} shortcut={{ modifiers: ["cmd", "shift"], key: "o" }} />
            <Action.ShowInFinder path={file.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
            <Action.CopyToClipboard
              title="Copy Path"
              content={file.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Create a New Markdown File"
              icon={Icon.NewDocument}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={showCreateFileForm}
            />
            <Action
              title="Refresh List"
              icon={Icon.RotateClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={revalidate}
            />
            <Action
              title="Load More Files"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              onAction={loadMoreFiles}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Browse Tags"
              icon={Icon.Tag}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={showTagSearchList}
            />
            {selectedTag && (
              <Action
                title="Clear Tag Filter"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                onAction={() => setSelectedTag(null)}
              />
            )}
            <Action
              title={showColorTags ? "Hide Colored Tags" : "Show Colored Tags"}
              icon={showColorTags ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => setShowColorTags(!showColorTags)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Move to Trash"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={handleMoveToTrash}
            />
            <Action
              title="Delete File"
              icon={Icon.DeleteDocument}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "cmd"], key: "x" }}
              onAction={confirmDelete}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={openCommandPreferences}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>{paginationActions}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
