import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { getAllNotes, listFolders } from "./utils";
import { NoteListItem } from "./note-list-item";

export default function BrowseNotes() {
  const [selectedFolder, setSelectedFolder] = useState("__all__");

  const { data: notes = [], isLoading, revalidate } = usePromise(getAllNotes);
  const { data: folders = [] } = usePromise(listFolders);

  const sorted = useMemo(
    () => [...notes].sort((a, b) => b.mtime.getTime() - a.mtime.getTime()),
    [notes],
  );

  const filtered = useMemo(() => {
    if (selectedFolder === "__all__") return sorted;
    return sorted.filter((n) => n.folder === selectedFolder);
  }, [sorted, selectedFolder]);

  // Group by folder for sectioned display
  const sections = useMemo(() => {
    if (selectedFolder !== "__all__")
      return [{ folder: selectedFolder, notes: filtered }];

    const groups = new Map<string, typeof filtered>();
    for (const note of filtered) {
      const key = note.folder || "(Root)";
      const list = groups.get(key) || [];
      list.push(note);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).map(([folder, notes]) => ({
      folder,
      notes,
    }));
  }, [filtered, selectedFolder]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter notes..."
      searchBarAccessory={
        <List.Dropdown title="Folder" onChange={setSelectedFolder}>
          <List.Dropdown.Item title="All Folders" value="__all__" />
          <List.Dropdown.Item title="Root" value="" />
          {folders.map((f) => (
            <List.Dropdown.Item key={f} title={f} value={f} />
          ))}
        </List.Dropdown>
      }
    >
      {filtered.length === 0 ? (
        <List.EmptyView
          title="No notes yet"
          description="Use Quick Capture to create your first note"
        />
      ) : (
        sections.map((section) => (
          <List.Section key={section.folder} title={section.folder}>
            {section.notes.map((note) => (
              <NoteListItem
                key={note.filePath}
                note={note}
                folders={folders}
                onRefresh={revalidate}
                showFolder={false}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
