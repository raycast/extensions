import { ActionPanel, List, OpenAction, PushAction, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Note } from "./bear-db";
import { useBearDb } from "./hooks";
import PreviewNote from "./preview-note";

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
    <List isLoading={notes == undefined} onSearchTextChange={setSearchQuery}>
      {notes?.map((note) => (
        <List.Item
          key={note.id}
          title={note.title}
          subtitle={note.tags.map((t) => `#${t}`).join(" ")}
          icon={{ source: "command-icon.png" }}
          actions={
            <ActionPanel>
              <OpenAction title="Open Note in Bear" target={`bear://x-callback-url/open-note?id=${note.id}`} />
              <PushAction title="Show Note Preview" target={<PreviewNote note={note} />} />
            </ActionPanel>
          }
          accessoryTitle={`modified ${formatDistanceToNowStrict(note.modifiedAt, { addSuffix: true })}`}
        />
      ))}
    </List>
  );
}
