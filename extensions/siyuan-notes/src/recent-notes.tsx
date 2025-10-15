import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  Clipboard,
  Detail,
} from "@raycast/api";
import { siyuanAPI } from "./api/siyuan";
import { SiYuanBlock } from "./types";

// Parse SiYuan timestamp to Date object (format: "20250730224544")
function parseSiYuanTime(timestamp: string): Date | null {
  if (!timestamp || timestamp.length !== 14) {
    return null;
  }

  try {
    // Parse format: YYYYMMDDHHMMSS
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(8, 10);
    const minute = timestamp.substring(10, 12);
    const second = timestamp.substring(12, 14);

    const date = new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}`,
    );

    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    return null;
  }
}

// Format SiYuan timestamp (format: "20250730224544")
function formatSiYuanTime(timestamp: string): string {
  const date = parseSiYuanTime(timestamp);
  if (!date) {
    return "Invalid time";
  }
  return date.toLocaleString("en-US");
}

// Note detail component - display complete document content
function NoteDetail({ block }: { block: SiYuanBlock }) {
  const [documentContent, setDocumentContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [filePaths, setFilePaths] = useState<
    { text: string; path: string; isAsset: boolean; originalPath: string }[]
  >([]);

  useEffect(() => {
    const loadDocumentContent = async () => {
      try {
        setLoading(true);
        console.log(`Starting to load document content: ${block.id}`);

        // Get complete document content
        const content = await siyuanAPI.getDocumentContent(block.id);
        console.log(`Fetched document content: ${content}`);

        if (content && content.trim()) {
          setDocumentContent(content);
          // Extract file paths
          const extractedPaths = siyuanAPI.extractLocalFilePaths(content);
          setFilePaths(extractedPaths);
        } else {
          // Show basic info if unable to get content
          setDocumentContent(
            `# ${block.content || "Untitled"}\n\nNo content or unable to fetch document content`,
          );
        }
      } catch (error) {
        console.error("Failed to fetch document content:", error);
        setDocumentContent(
          `# ${block.content || "Untitled"}\n\nError occurred while fetching content: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        setLoading(false);
      }
    };

    loadDocumentContent();
  }, [block.id]);

  // Build note markdown content - display complete document content
  const markdown = loading
    ? "Loading..."
    : documentContent || block.markdown || block.content || "No content";

  // processLocalFileLinks has already converted file links to file:// protocol, can be clicked directly to show in Finder

  // File action component - using Raycast's Action.Open component
  const FileAction = ({
    file,
    index,
  }: {
    file: {
      text: string;
      path: string;
      isAsset: boolean;
      originalPath: string;
    };
    index: number;
  }) => {
    const localPath = siyuanAPI.getLocalFilePath(file.path);

    console.log(
      `[DEBUG] FileAction (Recent Notes) - Original path: ${file.path}, Resolved path: ${localPath}`,
    );

    if (localPath) {
      return (
        <Action.Open
          title={`${file.text}`}
          icon={Icon.Document}
          target={localPath}
          shortcut={
            index < 9
              ? {
                  modifiers: ["cmd", "alt"],
                  key: (index + 1).toString() as
                    | "1"
                    | "2"
                    | "3"
                    | "4"
                    | "5"
                    | "6"
                    | "7"
                    | "8"
                    | "9",
                }
              : undefined
          }
        />
      );
    }

    console.log(
      `[DEBUG] FileAction (Recent Notes) - No local path found for: ${file.path}`,
    );
    return null;
  };

  return (
    <Detail
      markdown={markdown}
      navigationTitle={block.content || "Document Details"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Document ID" text={block.id} />
          <Detail.Metadata.Label
            title="Notebook"
            text={block.notebook_name || "Unknown Notebook"}
          />
          <Detail.Metadata.Label
            title="Path"
            text={`${block.notebook_name || "Unknown Notebook"}${block.hpath || "Unknown Path"}`}
          />
          <Detail.Metadata.Label
            title="Created"
            text={formatSiYuanTime(block.created)}
          />
          <Detail.Metadata.Label
            title="Updated"
            text={formatSiYuanTime(block.updated)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Characters"
            text={`${block.length || documentContent.length} characters`}
          />
          <Detail.Metadata.Label
            title="Type"
            text={block.type === "d" ? "Document" : "Block"}
          />
          {block.tag && (
            <Detail.Metadata.TagList title="Tags">
              <Detail.Metadata.TagList.Item text={block.tag} />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Siyuan"
            url={siyuanAPI.getDocUrl(block.id)}
          />

          {/* Add file open actions */}
          {filePaths.length > 0 && (
            <ActionPanel.Section title="Open Files">
              {filePaths
                .map((file, index) => {
                  const localPath = siyuanAPI.getLocalFilePath(file.path);

                  // Only keep open with default app option
                  if (localPath) {
                    return (
                      <FileAction
                        key={`${block.id}-file-${index}-local`}
                        file={file}
                        index={index}
                      />
                    );
                  }

                  return null;
                })
                .filter(Boolean)}
            </ActionPanel.Section>
          )}

          <ActionPanel.Section title="Other Actions">
            <Action.CopyToClipboard
              title="Copy Document Content"
              content={documentContent || block.markdown || block.content || ""}
            />
            <Action.CopyToClipboard
              title="Copy Document Id"
              content={block.id}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function RecentNotes() {
  const [recentNotes, setRecentNotes] = useState<SiYuanBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadRecentNotes();
  }, []);

  const loadRecentNotes = async () => {
    try {
      const notes = await siyuanAPI.getRecentDocs();
      setRecentNotes(notes);
    } catch (error) {
      console.error("Failed to get recent documents:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Get Recent Documents",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (content: string) => {
    try {
      await Clipboard.copy(content);
      showToast({
        style: Toast.Style.Success,
        title: "Copied to Clipboard",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Copy Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const refreshList = () => {
    setLoading(true);
    loadRecentNotes();
  };

  const getTimeAgo = (timestamp: string) => {
    try {
      const noteTime = parseSiYuanTime(timestamp);
      if (!noteTime) return "Invalid time";

      const now = new Date();
      const diffMs = now.getTime() - noteTime.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hr ago`;
      if (diffDays < 7) return `${diffDays} days ago`;

      return noteTime.toLocaleDateString("en-US");
    } catch (error) {
      return "Invalid time";
    }
  };

  const getAccessories = (note: SiYuanBlock) => {
    const accessories = [];

    // Add last access time
    accessories.push({
      text: getTimeAgo(note.updated),
      tooltip: `Last updated: ${formatSiYuanTime(note.updated)}`,
    });

    return accessories;
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search recent notes..."
      actions={
        <ActionPanel>
          <Action
            title="Refresh List"
            icon={Icon.ArrowClockwise}
            onAction={refreshList}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {recentNotes.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Recent Notes"
          description="Open documents in SiYuan and they will appear here"
          actions={
            <ActionPanel>
              <Action
                title="Refresh List"
                icon={Icon.ArrowClockwise}
                onAction={refreshList}
              />
            </ActionPanel>
          }
        />
      ) : (
        recentNotes.map((note, index) => (
          <List.Item
            key={note.id}
            icon={{
              source: Icon.Document,
              tintColor: index < 3 ? Color.Blue : Color.SecondaryText,
            }}
            title={note.name || note.content.substring(0, 50)}
            subtitle={`${note.notebook_name || "Unknown Notebook"} · ${note.hpath || note.path || "Unknown Path"}`}
            accessories={getAccessories(note)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={<NoteDetail block={note} />}
                />
                <Action
                  title="Copy Content"
                  icon={Icon.Clipboard}
                  onAction={() => copyLink(note.markdown || note.content)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Copy Link"
                  icon={Icon.Link}
                  onAction={() => copyLink(`siyuan://blocks/${note.id}`)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.OpenInBrowser
                  url={siyuanAPI.getDocUrl(note.rootID || note.id)}
                  title="Open in Siyuan"
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <ActionPanel.Section>
                  <Action
                    title="Refresh List"
                    icon={Icon.ArrowClockwise}
                    onAction={refreshList}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
