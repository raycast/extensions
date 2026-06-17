import { List, showToast, Toast } from "@raycast/api";
import { formatDistanceToNowStrict } from "date-fns";
import { useState, useEffect } from "react";
import { Note } from "./bear-db";
import { useBearDb } from "./hooks";
import NoteActions from "./note-actions";

export default function NoteLinks({ note }: { note: Note }) {
  const [db, error] = useBearDb();
  const [backlinks, setBacklinks] = useState<Note[]>();
  const [links, setLinks] = useState<Note[]>();

  useEffect(() => {
    if (db != null) {
      setBacklinks(db.getBacklinks(note.id));
      setLinks(db.getNoteLinks(note.id));
    }
  }, [db]);

  if (error) {
    showToast(Toast.Style.Failure, "Something went wrong", error.message);
  }

  return (
    <List isLoading={backlinks == undefined} navigationTitle={note.title}>
      <List.Section title="Note Backlinks">
        {backlinks?.map((note) => (
          <List.Item
            key={note.id}
            title={note.title === "" ? "Untitled Note" : note.encrypted ? "🔒 " + note.title : note.title}
            subtitle={note.formattedTags}
            icon={{ source: "command-icon.png" }}
            keywords={[note.id]}
            actions={<NoteActions isNotePreview={false} note={note} />}
            accessories={[{ text: `edited ${formatDistanceToNowStrict(note.modifiedAt, { addSuffix: true })}` }]}
          />
        ))}
      </List.Section>
      <List.Section title="Note Links">
        {links?.map((note) => (
          <List.Item
            key={note.id}
            title={note.title === "" ? "Untitled Note" : note.encrypted ? "🔒 " + note.title : note.title}
            subtitle={note.formattedTags}
            icon={{ source: "command-icon.png" }}
            keywords={[note.id]}
            actions={<NoteActions isNotePreview={false} note={note} />}
            accessories={[{ text: `edited ${formatDistanceToNowStrict(note.modifiedAt, { addSuffix: true })}` }]}
          />
        ))}
      </List.Section>
    </List>
  );
}
