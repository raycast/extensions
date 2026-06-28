import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

import { AuthenticateView } from "./components/authenticate-view";
import { NoteDetailScreen } from "./components/note-detail";
import { listNotes } from "./lib/api";
import { deleteNoteWithConfirmation, deleteActionStyle } from "./lib/delete-note";
import { normalizeGetNoteError } from "./lib/errors";
import { notePreviewMarkdown } from "./lib/format";
import { buildNoteBrowserUrl } from "./lib/note-url";
import { openNoteSourceInBrowser } from "./lib/open-note-source";
import { NoteSummary } from "./lib/types";
import { useGetNoteCredentials } from "./hooks/use-getnote-credentials";

export default function RecentNotesCommand() {
  const { credentials, isLoading: isAuthLoading, reload } = useGetNoteCredentials();
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listNotes();
      setNotes(data.notes.slice(0, 10));
      setTotal(data.total);
    } catch (nextError) {
      setError(normalizeGetNoteError(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (credentials) {
      void load();
    }
  }, [credentials]);

  if (isAuthLoading) {
    return <List isLoading searchBarPlaceholder="Checking GetNote connection..." />;
  }

  if (!credentials) {
    return <AuthenticateView onConnected={reload} />;
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Filter recent notes"
      navigationTitle={total == null ? "Recent Notes" : `Recent Notes · ${total} total`}
    >
      {error ? <List.EmptyView title="Failed to Load" description={error} /> : null}
      {!error && notes.length === 0 && !isLoading ? <List.EmptyView title="No Notes Yet" /> : null}
      {notes.map((note) => (
        <List.Item
          key={note.note_id}
          title={note.title || "Untitled Note"}
          subtitle={note.note_type}
          accessories={[{ text: note.created_at }]}
          detail={<List.Item.Detail markdown={notePreviewMarkdown(note)} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                icon={Icon.Sidebar}
                target={<NoteDetailScreen noteId={note.note_id} initialNote={note} initialNoteIsPartial />}
              />
              <Action.OpenInBrowser title="Open in Browser" icon={Icon.Globe} url={buildNoteBrowserUrl(note.note_id)} />
              {note.note_type?.toLowerCase() === "link" ? (
                <Action
                  title="Open Source URL"
                  icon={Icon.Link}
                  onAction={() => openNoteSourceInBrowser(note.note_id)}
                />
              ) : null}
              {note.source === "app" || !note.content ? null : (
                <Action.CopyToClipboard title="Copy Summary" content={note.content} />
              )}
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={deleteActionStyle}
                onAction={async () => {
                  const deleted = await deleteNoteWithConfirmation(note.note_id);

                  if (!deleted) {
                    return;
                  }

                  setNotes((currentNotes) =>
                    currentNotes.filter((currentNote) => currentNote.note_id !== note.note_id),
                  );
                  setTotal((currentTotal) => (currentTotal == null ? currentTotal : Math.max(currentTotal - 1, 0)));
                }}
              />
              <Action.CopyToClipboard title="Copy Note ID" content={note.note_id} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
