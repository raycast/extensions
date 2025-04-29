import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getPanelId } from "./utils/getPanelId";
import getCache from "./utils/getCache";
import { fetchGranolaData } from "./utils/fetchData";
import convertHtmlToMarkdown from "./utils/convertHtmltoMarkdown";
import { GetDocumentsResponse, Doc, NoteActionsProps } from "./utils/types";
import Unresponsive from "./templates/unresponsive";

interface NoteData {
  isLoading: boolean;
  data: GetDocumentsResponse;
  revalidate: () => void;
}

const sortNotesByDate = (docs: Doc[] | undefined): Doc[] => {
  if (!docs) return [];
  return [...docs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

const NoteActions = ({ doc, panels, children }: NoteActionsProps) => {
  // Safely get panel ID once and reuse it
  const panelId = getPanelId(panels, doc.id);
  const canShare = doc.sharing_link_visibility === "public" && panelId;
  const shareUrl = panelId ? `https://notes.granola.ai/p/${panelId}` : "";

  // Safely access notes content with fallbacks at each level
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
          {/* eslint-disable-next-line */}
          <Action.CopyToClipboard icon={Icon.CodeBlock} content={notes} title="Copy Notes as HTML" />
        </>
      )}
    </>
  );
};

export default function Command() {
  let noteData: NoteData;
  try {
    noteData = fetchGranolaData("get-documents") as NoteData;
  } catch (error) {
    showFailureToast({ title: "Failed to fetch notes", message: String(error) });
    return <Unresponsive />;
  }

  const cacheData = getCache();
  const panels = cacheData?.state?.documentPanels;

  // if loading...
  if (!noteData?.data && noteData.isLoading === true) {
    return <List isLoading={true} />;
  }

  // if not loading and no data
  if (!noteData?.data && noteData.isLoading === false) {
    return <Unresponsive />;
  }

  // if no cached data
  if (!panels) {
    return <Unresponsive />;
  }

  const untitledNoteTitle = "Untitled Note";

  if (noteData?.data) {
    return (
      <List isLoading={false}>
        {sortNotesByDate(noteData.data.docs).map((doc) => (
          <List.Item
            key={doc.id}
            title={doc.title ?? untitledNoteTitle}
            accessories={[
              { date: new Date(doc.created_at) },
              { text: doc.creation_source },
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

                        // Safely access the content with fallback
                        const panelData = panels[doc.id][panelId];
                        const htmlContent = panelData?.original_content || "";

                        let markdownContent = doc.notes_markdown || "" + "\n\n";
                        try {
                          markdownContent += convertHtmlToMarkdown(htmlContent);
                        } catch (error) {
                          console.error(`Error converting note ${doc.id} content to markdown:`, error);
                          markdownContent += htmlContent; // Fallback to original content
                        }
                        return `# ${doc.title}\n\n Created at: ${new Date(doc.created_at).toLocaleString()}\n\n---\n\n${markdownContent}\n\n --- \n\n${doc.notes_markdown}`;
                      })()}
                      actions={
                        <ActionPanel>
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
        ))}
      </List>
    );
  }
}
