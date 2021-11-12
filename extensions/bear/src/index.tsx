import { List, showToast, ToastStyle } from "@raycast/api";
import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useState } from "react";
import { Note } from "./bear-db";
import { useBearDb } from "./hooks";
import NoteActions from "./note-actions";

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
    <List
      isLoading={notes == undefined}
      onSearchTextChange={setSearchQuery}
      searchBarPlaceholder="Search note text or id ..."
    >
      {notes?.map((note) => (
        <List.Item
          key={note.id}
          title={note.title === "" ? "Untitled Note" : note.encrypted ? "🔒 " + note.title : note.title}
          subtitle={note.formattedTags}
          icon={{ source: "command-icon.png" }}
          keywords={[note.id]}
          actions={<NoteActions isNotePreview={false} note={note} />}
          accessoryTitle={`edited ${formatDistanceToNowStrict(note.modifiedAt, { addSuffix: true })}`}
        />
      ))}
    </List>
  );
}
