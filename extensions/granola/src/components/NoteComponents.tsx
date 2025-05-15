import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";

import { getPanelId } from "../utils/getPanelId";
import { getTranscript } from "../utils/fetchData";
import convertHtmlToMarkdown from "../utils/convertHtmltoMarkdown";
import { convertDocumentToMarkdown } from "../utils/convertJsonNodes";
import { Doc, NoteActionsProps, PanelsByDocId } from "../utils/types";

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

  return (
    <>
      {children}
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
}: {
  doc: Doc;
  panels: PanelsByDocId;
  untitledNoteTitle?: string;
}) {
  return (
    <List.Item
      key={doc.id}
      title={doc.title ?? untitledNoteTitle}
      accessories={[
        { date: new Date(doc.created_at) },
        { text: doc.creation_source || "Unknown source" },
        { text: doc.public ? "Public" : "Private" },
      ]}
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

                  // Check if doc.id exists in panels and if panelId is valid
                  if (!panels[doc.id] || !panelId || !panels[doc.id][panelId]) {
                    // if no AI generated notes exist, look for original notes
                    if (doc.notes_markdown) {
                      return `# ${doc.title ?? untitledNoteTitle}\n\n Created at: ${new Date(doc.created_at).toLocaleString()}\n\n---\n\n${doc.notes_markdown}`;
                    }
                    return `# ${doc.title ?? untitledNoteTitle}\n\n Created at: ${new Date(doc.created_at).toLocaleString()}\n\n---\n\nNo content available for this note.`;
                  }

                  const panelData = panels[doc.id][panelId];
                  const htmlContent = panelData.content
                    ? convertDocumentToMarkdown(panelData.content)
                    : panelData.original_content || "";

                  return `# ${doc.title ?? untitledNoteTitle}\n\n Created at: ${new Date(doc.created_at).toLocaleString()}\n\n---\n\n${htmlContent}`;
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
