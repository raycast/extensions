import { List, Icon, Color } from "@raycast/api";
import { useState, useMemo } from "react";
import { useGranolaData } from "./utils/useGranolaData";
import { useFolders } from "./utils/useFolders";
import { Doc } from "./utils/types";
import Unresponsive from "./templates/unresponsive";
import { sortNotesByDate, NoteListItem } from "./components/NoteComponents";
import { mapIconToHeroicon, mapColorToHex, getDefaultIconUrl } from "./utils/iconMapper";

export default function Command() {
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const { folders, isLoading: foldersLoading } = useFolders();
  const { noteData, panels, isLoading, hasError } = useGranolaData();

  const { filteredNotes, notesNotInFolders, folderNoteCounts } = useMemo(() => {
    const allNotes = noteData?.data?.docs || [];
    const noteIds = new Set(allNotes.map((d) => d.id));

    const notesInFolders = new Set<string>();
    const counts: Record<string, number> = {};

    folders.forEach((folder) => {
      // Intersect folder.document_ids with currently loaded documents to keep counts accurate without cache
      const filteredIds = folder.document_ids.filter((id) => noteIds.has(id));
      counts[folder.id] = filteredIds.length;
      filteredIds.forEach((docId) => notesInFolders.add(docId));
    });

    const orphanNotes = allNotes.filter((doc) => !notesInFolders.has(doc.id));

    let filtered: Doc[];
    if (selectedFolder === "all") {
      filtered = allNotes;
    } else if (selectedFolder === "orphans") {
      filtered = orphanNotes;
    } else {
      filtered = allNotes.filter((doc) => {
        const folder = folders.find((f) => f.id === selectedFolder);
        if (!folder) return false;
        return folder.document_ids.includes(doc.id);
      });
    }

    return {
      filteredNotes: filtered,
      notesNotInFolders: orphanNotes,
      folderNoteCounts: counts,
    };
  }, [noteData?.data?.docs, folders, selectedFolder]);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (hasError) {
    return <Unresponsive />;
  }

  const untitledNoteTitle = "Untitled Note";

  if (noteData?.data) {
    return (
      <List
        isLoading={false}
        searchBarPlaceholder={
          selectedFolder === "all"
            ? "Search all notes..."
            : selectedFolder === "orphans"
              ? "Search notes not in folders..."
              : `Search notes in ${folders.find((f) => f.id === selectedFolder)?.title || "folder"}...`
        }
        searchBarAccessory={
          <List.Dropdown tooltip="Filter by Folder" storeValue={true} onChange={setSelectedFolder}>
            <List.Dropdown.Section title="All Notes">
              <List.Dropdown.Item title="All Folders" value="all" icon={Icon.Folder} />
              {notesNotInFolders.length > 0 && (
                <List.Dropdown.Item
                  title={`Notes Not in Folders (${notesNotInFolders.length})`}
                  value="orphans"
                  icon={{ source: Icon.Document, tintColor: Color.SecondaryText }}
                />
              )}
            </List.Dropdown.Section>

            {!foldersLoading && folders.length > 0 && (
              <List.Dropdown.Section title="Folders">
                {folders
                  .sort((a, b) => a.title.localeCompare(b.title)) // Sort alphabetically
                  .map((folder) => (
                    <List.Dropdown.Item
                      key={folder.id}
                      title={`${folder.title} (${folderNoteCounts[folder.id] || 0})`}
                      value={folder.id}
                      icon={{
                        source: folder.icon ? mapIconToHeroicon(folder.icon.value) : getDefaultIconUrl(),
                        tintColor: folder.icon ? mapColorToHex(folder.icon.color) : Color.Blue,
                      }}
                    />
                  ))}
              </List.Dropdown.Section>
            )}
          </List.Dropdown>
        }
      >
        {sortNotesByDate(filteredNotes).map((doc: Doc) => (
          <NoteListItem
            key={doc.id}
            doc={doc}
            panels={panels || {}}
            untitledNoteTitle={untitledNoteTitle}
            folders={folders}
          />
        ))}
      </List>
    );
  }
}
