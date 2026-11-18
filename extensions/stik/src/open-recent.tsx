import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { getAllNotes, listFolders } from "./utils";
import { NoteListItem } from "./note-list-item";

export default function OpenRecent() {
  const { data: notes = [], isLoading, revalidate } = usePromise(getAllNotes);
  const { data: folders = [] } = usePromise(listFolders);

  const recent = useMemo(
    () =>
      [...notes]
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
        .slice(0, 10),
    [notes],
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter recent notes...">
      {recent.length === 0 ? (
        <List.EmptyView
          title="No recent notes"
          description="Use Quick Capture to create your first note"
        />
      ) : (
        recent.map((note) => (
          <NoteListItem
            key={note.filePath}
            note={note}
            folders={folders}
            onRefresh={revalidate}
          />
        ))
      )}
    </List>
  );
}
