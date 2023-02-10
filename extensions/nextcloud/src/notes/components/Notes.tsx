import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getPreferences } from "../../preferences";
import { Note, useNotes } from "../hooks";
import { NoteDetails } from "./NoteDetails";

export function Notes() {
  const { notes, isLoading } = useNotes();

  return (
    <List isLoading={isLoading}>
      <List.Section title="Notes" subtitle={String(notes.length)}>
        {notes.map((note) => (
          <Note key={note.id} note={note} />
        ))}
      </List.Section>
    </List>
  );
}
function Note({ note }: { note: Note }) {
  const { hostname } = getPreferences();

  const noteUrl = `https://${hostname}/apps/notes/note/${note.id}`;

  return (
    <List.Item
      title={note.title}
      icon={{ source: Icon.TextDocument }}
      actions={
        <ActionPanel title={note.title}>
          <ActionPanel.Section>
            <Action.Push icon={Icon.Eye} title="Show Details" target={<NoteDetails note={note} />} />
            <Action.OpenInBrowser title="Open in Browser" url={noteUrl} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
