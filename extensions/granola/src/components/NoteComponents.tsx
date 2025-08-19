import { ActionPanel, Detail, List, Action, Icon, showToast, Toast, open, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";

import { getPanelId } from "../utils/getPanelId";
import { getTranscript } from "../utils/fetchData";
import convertHtmlToMarkdown from "../utils/convertHtmltoMarkdown";
import { convertDocumentToMarkdown } from "../utils/convertJsonNodes";
import { saveToNotion } from "../utils/granolaApi";
import { Doc, NoteActionsProps, PanelsByDocId, Folder } from "../utils/types";
import { mapIconToHeroicon, mapColorToHex, getDefaultIconUrl } from "../utils/iconMapper";

/**
 * Sorts notes by date (newest first)
 */
export const sortNotesByDate = (docs: Doc[] | undefined): Doc[] => {
  if (!docs) return [];
  return [...docs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

/**
 * Component that provides standard actions for a note
 */
export const NoteActions = ({ doc, panels, children }: NoteActionsProps) => {
  const panelId = getPanelId(panels, doc.id);
  const canShare = doc.sharing_link_visibility === "public" && panelId;
  const shareUrl = panelId ? `https://notes.granola.ai/p/${panelId}` : "";

  let notes = "";
  if (panels && doc.id && panels[doc.id] && panelId && panels[doc.id][panelId]) {
    notes = panels[doc.id][panelId].original_content || "";
  }

  const handleSaveToNotion = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Saving to Notion...",
      });

      const result = await saveToNotion(doc.id);

      await showToast({
        style: Toast.Style.Success,
        title: "Saved to Notion!",
        primaryAction: {
          title: "Open in Notion",
          onAction: async () => {
            // Open the Notion page URL with security validation
            if (result.page_url && result.page_url.startsWith("https://www.notion.so/")) {
              try {
                await open(result.page_url);
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to open Notion page",
                  message: "Unable to open the URL",
                });
              }
            }
          },
        },
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save to Notion",
        message: String(error),
      });
    }
  };

  return (
    <>
      {children}
      {doc.notes_markdown && (
        <Action.Push
          title="View My Notes"
          icon={Icon.Text}
          target={
            <Detail
              markdown={`# ${doc.title || "My Notes"}\n\n---\n\n${doc.notes_markdown}`}
              navigationTitle="My Notes"
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy My Notes"
                    content={doc.notes_markdown}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          }
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
      )}
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
        showFailureToast({ title: "Failed to load transcript", message: String(error) });
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
 * Component to display a note as a list item with standard actions
 */
export function NoteListItem({
  doc,
  panels,
  untitledNoteTitle = "Untitled Note",
  folders = [],
}: {
  doc: Doc;
  panels: PanelsByDocId;
  untitledNoteTitle?: string;
  folders?: Folder[]; // Expected to contain accurate document_ids (filtered against cache)
}) {
  // Find which folder this note belongs to

  const noteFolder = folders.find((folder) => folder.document_ids.includes(doc.id));

  // Build accessories array
  const accessories: List.Item.Accessory[] = [{ date: new Date(doc.created_at) }];

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
            target={
              <Detail
                markdown={(() => {
                  // Get panel ID with safe fallback
                  const panelId = getPanelId(panels, doc.id);
                  const panelData = panels && panels[doc.id] && panelId ? panels[doc.id][panelId] : null;

                  let content = "";
                  if (panelData) {
                    content = panelData.content
                      ? convertDocumentToMarkdown(panelData.content)
                      : panelData.original_content || "";
                  }

                  if (!content && doc.notes_markdown) {
                    content = doc.notes_markdown;
                  }

                  // Check for iOS unsynced note case
                  if (!content.trim() && doc.creation_source === "iOS") {
                    return `# ${
                      doc.title ?? untitledNoteTitle
                    }\n\n---\n\nThis note was created on an iOS device and needs to be synced.\n\nPlease open this note in the Granola app to view its content. Then you need to reload the Raycast window to see the updated content.`;
                  }

                  if (!content.trim()) {
                    return `# ${doc.title ?? untitledNoteTitle}\n\n Created at: ${new Date(
                      doc.created_at,
                    ).toLocaleString()}\n\n---\n\nNo content available for this note.`;
                  }

                  return `# ${doc.title ?? untitledNoteTitle}\n\n Created at: ${new Date(
                    doc.created_at,
                  ).toLocaleString()}\n\n---\n\n${content}`;
                })()}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Transcript"
                      icon={Icon.Waveform}
                      target={<FullTranscriptDetail docId={doc.id} title={doc.title ?? untitledNoteTitle} />}
                    />
                    <NoteActions doc={doc} panels={panels} />
                  </ActionPanel>
                }
              />
            }
          />
          <NoteActions doc={doc} panels={panels} />
        </ActionPanel>
      }
    />
  );
}
