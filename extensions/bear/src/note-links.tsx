import { List, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { Note } from "./bear-db";
import { useBearDb } from "./hooks";
import NoteItem from "./note-item";

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
    showToast(ToastStyle.Failure, "Something went wrong", error.message);
  }

  return (
    <List isLoading={backlinks == undefined} navigationTitle={note.title}>
      <List.Section title="Note Backlinks">
        {backlinks?.map((note) => (
          <NoteItem note={note}></NoteItem>
        ))}
      </List.Section>
      <List.Section title="Note Links">
        {links?.map((note) => (
          <NoteItem note={note}></NoteItem>
        ))}
      </List.Section>
    </List>
  );
}
