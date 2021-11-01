import { List, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { Note } from "./bear-db";
import { useBearDb } from "./hooks";
import NoteItem from "./note-item";

export default function SearchNotes() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [db, error] = useBearDb();
  const [notes, setNotes] = useState<Note[]>();
  
  useEffect(() => {
    if (db != null) {
      setNotes(db.getNotes(searchQuery));
    }
  }, [db, searchQuery]);

  if (error) {
    showToast(ToastStyle.Failure, "Something went wrong", error.message);
  }

  return (
    <List isLoading={notes == undefined} onSearchTextChange={setSearchQuery} searchBarPlaceholder="Search note text or id ...">
      {notes?.map((note) => (
        <NoteItem note={note}></NoteItem>
      ))}
    </List>
  );
}
