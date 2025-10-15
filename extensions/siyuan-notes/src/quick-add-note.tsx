import { useState, useEffect, useRef, useCallback } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  showHUD,
  closeMainWindow,
  PopToRootType,
  Icon,
  LaunchProps,
  List,
  Detail,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { pasteFromClipboard } from "./utils/clipboard";
import { siyuanAPI } from "./api/siyuan";
import { SiYuanBlock } from "./types";

interface FormValues {
  content: string;
  addTimestamp: boolean;
}

interface Arguments {
  content?: string;
}

// Document selector component
function DocumentSelector({ onSelect }: { onSelect: (docId: string) => void }) {
  const [recentNotes, setRecentNotes] = useState<SiYuanBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText] = useState("");

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

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      loadRecentNotes();
      return;
    }

    try {
      setLoading(true);
      const searchResults = await siyuanAPI.searchNotes(query);
      // Only show document type results
      const docs = searchResults.blocks.filter((block) => block.isDocument);
      setRecentNotes(docs);
    } catch (error) {
      console.error("Failed to search documents:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Search Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string): string => {
    if (!timestamp || timestamp.length !== 14) return "Invalid time";

    try {
      const year = timestamp.substring(0, 4);
      const month = timestamp.substring(4, 6);
      const day = timestamp.substring(6, 8);
      const hour = timestamp.substring(8, 10);
      const minute = timestamp.substring(10, 12);

      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hr ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString("en-US");
    } catch (error) {
      return "Invalid time";
    }
  };

  return (
    <List
      isLoading={loading}
      onSearchTextChange={handleSearch}
      searchText={searchText}
      searchBarPlaceholder="Search documents or view recently modified documents..."
      navigationTitle="Select Target Document"
    >
      <List.Section title="Documents List">
        {recentNotes.map((note, index) => (
          <List.Item
            key={note.id}
            icon={{
              source: Icon.Document,
              tintColor: index < 3 ? "#007AFF" : "#8E8E93",
            }}
            title={note.content || "Untitled"}
            subtitle={`${note.notebook_name || "Unknown Notebook"} • ${note.hpath || "Unknown Path"}`}
            accessories={[
              {
                text: formatDate(note.updated),
                tooltip: `Last updated: ${formatDate(note.updated)}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Select This Document"
                  icon={Icon.Check}
                  onAction={() => onSelect(note.id)}
                />
                <Action.OpenInBrowser
                  title="Open in Siyuan"
                  url={siyuanAPI.getDocUrl(note.id)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {recentNotes.length === 0 && !loading && (
        <List.EmptyView
          icon={Icon.Document}
          title="No Documents Found"
          description={
            searchText
              ? "Try searching with different keywords"
              : "No recently accessed documents"
          }
        />
      )}
    </List>
  );
}

export default function QuickAddNote(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { content: initialContent } = props.arguments;
  const [content, setContent] = useState<string>("");
  const [showDocumentSelector, setShowDocumentSelector] =
    useState<boolean>(false);

  // Use localStorage to persist timestamp setting, default to false
  const { value: addTimestamp, setValue: setAddTimestamp } = useLocalStorage(
    "quick-add-timestamp",
    false,
  );

  // Use ref to prevent duplicate execution in React Strict Mode
  const hasExecutedRef = useRef<boolean>(false);
  const hasLoadedClipboardRef = useRef<boolean>(false);

  // Check if in quick add mode (auto-add to recent document when content parameter provided)
  const isQuickMode = Boolean(initialContent && initialContent.trim());

  // Auto-load clipboard content
  const loadClipboardContent = useCallback(async () => {
    if (hasLoadedClipboardRef.current) return;
    hasLoadedClipboardRef.current = true;

    try {
      const clipboardText = await pasteFromClipboard();
      if (clipboardText && clipboardText.trim()) {
        setContent(clipboardText);
      }
    } catch (error) {
      console.error("Failed to read clipboard:", error);
    }
  }, []);

  // Get document title
  const getDocumentTitle = useCallback(async (docId: string) => {
    try {
      const blockInfo = await siyuanAPI.getBlockInfo(docId);
      return blockInfo.content || "Unknown document";
    } catch (error) {
      console.error("Failed to get document info:", error);
      return "Unknown document";
    }
  }, []);

  // Select recently edited document and add content directly
  const handleSelectRecentDocument = useCallback(async () => {
    try {
      // Check if there is content to add
      const contentToAdd = content.trim();
      if (!contentToAdd) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please Enter Content to Add",
        });
        return;
      }

      const mostRecentDocId = await siyuanAPI.getMostRecentDocumentId();
      if (mostRecentDocId) {
        const title = await getDocumentTitle(mostRecentDocId);

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Adding to Recently Edited Document...",
          message: title,
        });

        // Add content directly to recent document
        await siyuanAPI.addToDocument(
          mostRecentDocId,
          contentToAdd,
          addTimestamp || false,
        );

        toast.style = Toast.Style.Success;
        toast.title = "✅ Added to Recently Edited Document";
        toast.message = title;

        // Close main window
        await closeMainWindow({
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Recent Document Found",
        });
      }
    } catch (error) {
      console.error("Failed to get recent document:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Add Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [getDocumentTitle, content, addTimestamp]);

  // Quick add feature - auto-select recent document
  const handleQuickAdd = useCallback(
    async (content: string) => {
      try {
        // Get recently edited document
        const mostRecentDocId = await siyuanAPI.getMostRecentDocumentId();
        if (!mostRecentDocId) {
          await showHUD("❌ No Recent Document Found");
          await closeMainWindow({
            clearRootSearch: true,
            popToRootType: PopToRootType.Immediate,
          });
          return;
        }

        await siyuanAPI.addToDocument(
          mostRecentDocId,
          content,
          addTimestamp || false,
        ); // Use user's timestamp setting

        await closeMainWindow({
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        });

        await showHUD("✅ Added to Recently Edited Document");
      } catch (error) {
        await closeMainWindow({
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        });

        await showHUD(
          `❌ Add Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
    [addTimestamp],
  );

  // Execute add operation immediately if in quick mode
  useEffect(() => {
    if (isQuickMode && !hasExecutedRef.current) {
      hasExecutedRef.current = true;
      handleQuickAdd(initialContent!);
    }
  }, [isQuickMode, initialContent, handleQuickAdd]);

  // Load clipboard content on initialization
  useEffect(() => {
    if (!isQuickMode && !initialContent) {
      loadClipboardContent();
    } else if (initialContent) {
      setContent(initialContent);
    }
  }, [isQuickMode, initialContent, loadClipboardContent]);

  const handleDocumentSelect = async (docId: string) => {
    try {
      const title = await getDocumentTitle(docId);

      // Check if there is content to add
      const contentToAdd = content.trim();
      if (!contentToAdd) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please Enter Content to Add",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Adding to Document...",
        message: title,
      });

      // Add content directly to selected document
      await siyuanAPI.addToDocument(docId, contentToAdd, addTimestamp || false);

      toast.style = Toast.Style.Success;
      toast.title = "✅ Added to Document";
      toast.message = title;

      // Close main window
      await closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    } catch (error) {
      console.error("Failed to select document:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Add Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Return null in quick mode to avoid UI flashing
  if (isQuickMode) {
    return null;
  }

  // If document selector is being displayed
  if (showDocumentSelector) {
    return <DocumentSelector onSelect={handleDocumentSelect} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Select Target Document"
              icon={Icon.List}
              onAction={() => setShowDocumentSelector(true)}
            />
            <Action
              title="Use Recently Edited Document"
              icon={Icon.Clock}
              onAction={handleSelectRecentDocument}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        title="Quick Add"
        text="Quickly add content to specified SiYuan note document"
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter content to add... Supports Markdown format"
        value={content}
        onChange={setContent}
        enableMarkdown
        autoFocus
      />

      <Form.Checkbox
        id="addTimestamp"
        title="Options"
        label="Add Timestamp"
        value={addTimestamp || false}
        onChange={async (value) => {
          await setAddTimestamp(value);
        }}
      />

      <Form.Separator />

      <Form.Description
        title="Instructions"
        text="• Content auto-loads from clipboard
• Use Cmd+Enter to select document to add to
• Use Cmd+R to quickly select recently edited document
• Supports Markdown format
• Supports pasting to current app"
      />
    </Form>
  );
}
