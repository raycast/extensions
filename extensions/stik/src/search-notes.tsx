import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { getAllNotes, listFolders } from "./utils";
import { FolderDropdown } from "./folder-dropdown";
import { NoteListItem } from "./note-list-item";

export default function SearchNotes() {
  const [searchText, setSearchText] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("__all__");

  const { data: notes = [], isLoading, revalidate } = usePromise(getAllNotes);
  const { data: folders = [] } = usePromise(listFolders);

  const filtered = useMemo(() => {
    if (!searchText.trim()) return [];
    const q = searchText.toLowerCase();
    return notes
      .filter((n) => {
        if (selectedFolder !== "__all__" && n.folder !== selectedFolder)
          return false;
        return (
          n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  }, [searchText, notes, selectedFolder]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search notes..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <FolderDropdown folders={folders} onChange={setSelectedFolder} />
      }
    >
      {searchText.trim() === "" ? (
        <List.EmptyView
          title="Type to search"
          description="Search across all your Stik notes"
        />
      ) : filtered.length === 0 ? (
        <List.EmptyView
          title="No results"
          description={`No notes matching "${searchText}"`}
        />
      ) : (
        filtered.map((note) => (
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
