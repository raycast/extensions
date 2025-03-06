import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import TurndownService from "turndown";
import { getPanelId } from "./utils/getPanelId";
import getCache from "./utils/getCache";
import { fetchGranolaData } from "./utils/fetchData";
import Unresponsive from "./templates/unresponsive";
import { GetDocumentsResponse, Doc, NoteActionsProps } from "./utils/types";

interface NoteData {
  isLoading: boolean;
  data: GetDocumentsResponse;
  revalidate: () => void;
}

const sortNotesByDate = (docs: Doc[] | undefined): Doc[] => {
  if (!docs) return [];
  return [...docs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

const convertHtmlToMarkdown = (htmlContent: string): string => {
  const turndownService = new TurndownService();
  return turndownService.turndown(htmlContent);
};

const NoteActions = ({ doc, panels, children }: NoteActionsProps) => {
  const canShare = doc.sharing_link_visibility === "public" && getPanelId(panels, doc.id);
  const shareUrl = `https://notes.granola.ai/p/${getPanelId(panels, doc.id)}`;
  const notes = panels[doc.id][getPanelId(panels, doc.id) as string].original_content;

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

export default function Command() {
  const noteData = fetchGranolaData("get-documents") as NoteData;
  const cacheData = getCache();
  const panels = cacheData?.state?.documentPanels;

  // if loading...
  if (!noteData?.data && noteData.isLoading === true) {
    return <List isLoading={noteData.isLoading} />;
  }

  // if not loading and no data
  if (!noteData?.data && noteData.isLoading === false) {
    return <Unresponsive />;
  }

  // if no cached data
  if (!panels) {
    return <Unresponsive />;
  }

  if (noteData?.data) {
    return (
      <List>
        {sortNotesByDate(noteData?.data?.docs).map((doc) => (
          <List.Item
            key={doc.id}
            title={doc.title}
            accessories={[
              { date: new Date(doc.created_at) },
              { text: doc.creation_source },
              { text: doc.public ? "Public" : "Private" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  target={
                    <Detail
                      markdown={(() => {
                        const htmlContent = panels[doc.id][getPanelId(panels, doc.id) as string].original_content;
                        const markdownContent = convertHtmlToMarkdown(htmlContent);
                        return `# ${doc.title}\n\n Created at: ${new Date(doc.created_at).toLocaleString()}\n\n---\n\n${markdownContent}`;
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
