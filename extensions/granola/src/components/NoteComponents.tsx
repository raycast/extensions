import { ActionPanel, Detail, List, Action, Icon, showToast, Toast, open, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";

import { getPanelId } from "../utils/getPanelId";
import { getTranscript } from "../utils/fetchData";
import convertHtmlToMarkdown from "../utils/convertHtmltoMarkdown";
import { saveToNotion } from "../utils/granolaApi";
import { Doc, NoteActionsProps, PanelsByDocId, Folder } from "../utils/types";
import { mapIconToHeroicon, mapColorToHex, getDefaultIconUrl } from "../utils/iconMapper";
import { useDocumentPanels } from "../utils/useDocumentPanels";
import { useDocumentNotesMarkdown } from "../utils/useDocumentNotesMarkdown";
import { isAbortError, toError, toErrorMessage } from "../utils/errorUtils";

const NOTION_SAVE_TIMEOUT_MS = 120000;

const isTrustedNotionUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host === "www.notion.so" || host === "notion.so" || host === "notion.site" || host.endsWith(".notion.site");
  } catch {
    return false;
  }
};

/**
 * Sorts notes by date (newest first)
 */
export const sortNotesByDate = (docs: Doc[] | undefined): Doc[] => {
  if (!docs) return [];
  return [...docs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

const formatDate = (value?: string): string => {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString();
};

const openInGranola = async (documentId: string) => {
  await open(`granola://open-document?document_id=${documentId}`);
};

/**
 * Component that provides standard actions for a note
 * Panels are optional - if not provided, sharing actions will be disabled
 */
export const NoteActions = ({ doc, panels, children }: NoteActionsProps) => {
  const panelId = panels ? getPanelId(panels, doc.id) : undefined;
  const canShare = doc.sharing_link_visibility === "public" && panelId;
  const shareUrl = panelId ? `https://notes.granola.ai/p/${panelId}` : "";

  let notes = "";
  if (panels && doc.id && panelId && panels[doc.id] && panels[doc.id][panelId]) {
    notes = panels[doc.id][panelId].original_content || "";
  }

  const handleSaveToNotion = async () => {
    const controller = new AbortController();
    await showToast({
      style: Toast.Style.Animated,
      title: "Saving to Notion...",
    });

    const timeoutTimer = setTimeout(() => {
      controller.abort();
    }, NOTION_SAVE_TIMEOUT_MS);

    try {
      const result = await saveToNotion(doc.id, controller.signal);

      await showToast({
        style: Toast.Style.Success,
        title: "Saved to Notion!",
        primaryAction: {
          title: "Open in Notion",
          onAction: async () => {
            const pageUrl = result.page_url;
            if (!pageUrl || !isTrustedNotionUrl(pageUrl)) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Invalid Notion URL",
                message: "The returned URL is missing or not a Notion domain.",
              });
              return;
            }

            try {
              await open(pageUrl);
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to open Notion page",
                message: "Unable to open the URL",
              });
            }
          },
        },
      });
    } catch (error) {
      const message = isAbortError(error)
        ? "Save to Notion timed out. It may still finish in the background."
        : toErrorMessage(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save to Notion",
        message,
      });
    } finally {
      clearTimeout(timeoutTimer);
    }
  };

  return (
    <>
      {children}
      <Action
        title="Open in Granola"
        icon={Icon.Window}
        onAction={() => openInGranola(doc.id)}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      <Action
        title="Save to Notion"
        icon={Icon.Document}
        onAction={handleSaveToNotion}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />
      {canShare && (
        <>
          <Action.OpenInBrowser url={shareUrl} title="Open Note in Browser" />
          <Action.CopyToClipboard icon={Icon.CopyClipboard} content={shareUrl} title="Copy Note Share Link" />
          <Action.CopyToClipboard
            icon={Icon.Document}
            content={convertHtmlToMarkdown(notes)}
            title="Copy Notes as Markdown"
          />
          <Action.CopyToClipboard icon={Icon.CodeBlock} content={notes} title="Copy Notes as Html" />
        </>
      )}
    </>
  );
};

/**
 * Component to display a note's full transcript
 */
export function FullTranscriptDetail({ docId, title }: { docId: string; title: string }) {
  const [transcript, setTranscript] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchTranscript() {
      setIsLoading(true);
      try {
        const fetchedTranscript = await getTranscript(docId);
        setTranscript(fetchedTranscript);
      } catch (error) {
        showFailureToast(toError(error), { title: "Failed to load transcript" });
        setTranscript("Failed to load transcript."); // Show error in detail view
      } finally {
        setIsLoading(false);
      }
    }
    fetchTranscript();
  }, [docId]); // Re-run effect if docId changes

  const markdownContent = `# ${title}\n\n\n---\n${transcript}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdownContent}
      navigationTitle={`Transcript: ${title}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Transcript"
            content={markdownContent}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

/**
 * Component to display "My Notes" with lazy-loaded notes_markdown
 */
function MyNotesDetailView({
  doc,
  untitledNoteTitle,
  panels,
}: {
  doc: Doc;
  untitledNoteTitle: string;
  panels: PanelsByDocId | null;
}) {
  const { notesMarkdown, isLoading } = useDocumentNotesMarkdown(doc.id);

  const markdown =
    notesMarkdown && notesMarkdown.trim()
      ? `# ${doc.title ?? untitledNoteTitle}\n\n Created at: ${new Date(doc.created_at).toLocaleString()}\n\n---\n\n${notesMarkdown}`
      : `# ${doc.title ?? untitledNoteTitle}\n\n Created at: ${new Date(doc.created_at).toLocaleString()}\n\n---\n\nNo My Notes available for this note.`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy My Notes"
            content={notesMarkdown || ""}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <NoteActions doc={doc} panels={panels} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Component to display note details with lazy-loaded panels
 */
function NoteDetailView({ doc, untitledNoteTitle }: { doc: Doc; untitledNoteTitle: string }) {
  const { panels, isLoading: panelsLoading } = useDocumentPanels(doc.id);

  const panelId = panels ? getPanelId(panels, doc.id) : undefined;
  const panelData = panels && panels[doc.id] && panelId ? panels[doc.id][panelId] : null;

  let content = "";
  if (panelData?.original_content) {
    content = panelData.original_content;
  }

  // Convert HTML to markdown for proper display
  if (content) {
    content = convertHtmlToMarkdown(content);
  }

  // Special handling for iOS-created notes that haven't synced yet
  if (!content.trim() && doc.creation_source === "iOS") {
    return (
      <Detail
        isLoading={panelsLoading}
        markdown={`# ${doc.title ?? untitledNoteTitle}\n\n---\n\nThis note was created on an iOS device and needs to be synced.\n\nPlease open this note in the Granola app to view its content. Then you need to reload the Raycast window to see the updated content.`}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Transcript"
              icon={Icon.Waveform}
              target={<FullTranscriptDetail docId={doc.id} title={doc.title ?? untitledNoteTitle} />}
            />
            <Action.Push
              title="My Notes"
              icon={Icon.Code}
              target={<MyNotesDetailView doc={doc} untitledNoteTitle={untitledNoteTitle} panels={panels} />}
            />
            <NoteActions doc={doc} panels={panels} />
          </ActionPanel>
        }
      />
    );
  }

  // For notes with no content
  if (!content.trim()) {
    return (
      <Detail
        isLoading={panelsLoading}
        markdown={`# ${doc.title ?? untitledNoteTitle}\n\n Created at: ${new Date(doc.created_at).toLocaleString()}\n\n---\n\nNo content available for this note.`}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Transcript"
              icon={Icon.Waveform}
              target={<FullTranscriptDetail docId={doc.id} title={doc.title ?? untitledNoteTitle} />}
            />
            <Action.Push
              title="My Notes"
              icon={Icon.Code}
              target={<MyNotesDetailView doc={doc} untitledNoteTitle={untitledNoteTitle} panels={panels} />}
            />
            <NoteActions doc={doc} panels={panels} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={panelsLoading}
      markdown={`# ${doc.title ?? untitledNoteTitle}\n\n Created at: ${new Date(doc.created_at).toLocaleString()}\n\n---\n\n${content}`}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Transcript"
            icon={Icon.Waveform}
            target={<FullTranscriptDetail docId={doc.id} title={doc.title ?? untitledNoteTitle} />}
          />
          <Action.Push
            title="My Notes"
            icon={Icon.Code}
            target={<MyNotesDetailView doc={doc} untitledNoteTitle={untitledNoteTitle} panels={panels} />}
          />
          <NoteActions doc={doc} panels={panels} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Component to display a note as a list item with standard actions
 * Panels are loaded on-demand when details are viewed
 */
export function NoteListItem({
  doc,
  untitledNoteTitle = "Untitled Note",
  folders = [],
}: {
  doc: Doc;
  untitledNoteTitle?: string;
  folders?: Folder[]; // Expected to contain accurate document_ids (from API)
}) {
  // Find which folder this note belongs to

  const noteFolder = folders.find((folder) => folder.document_ids.includes(doc.id));

  // Build accessories array
  const accessories: List.Item.Accessory[] = [{ text: formatDate(doc.created_at) }];

  // Add folder icon if note is in a folder
  if (noteFolder) {
    accessories.push({
      icon: {
        source: noteFolder.icon ? mapIconToHeroicon(noteFolder.icon.value) : getDefaultIconUrl(),
        tintColor: noteFolder.icon ? mapColorToHex(noteFolder.icon.color) : Color.Blue,
      },
      tooltip: `In folder: ${noteFolder.title}`,
    });
  } else {
    // Show "No folder" indicator for orphaned notes
    accessories.push({
      icon: { source: Icon.Document, tintColor: Color.SecondaryText },
      tooltip: "Not in any folder",
    });
  }

  // Add privacy indicator
  accessories.push({
    text: doc.public ? "Public" : "Private",
  });

  return (
    <List.Item
      key={doc.id}
      title={doc.title ?? untitledNoteTitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.Book}
            target={<NoteDetailView doc={doc} untitledNoteTitle={untitledNoteTitle} />}
          />
          <NoteActions doc={doc} panels={null} />
        </ActionPanel>
      }
    />
  );
}
