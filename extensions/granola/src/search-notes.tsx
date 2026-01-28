import { List, Icon, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useMemo, useEffect } from "react";
import { useGranolaData } from "./utils/useGranolaData";
import { useFolders } from "./utils/useFolders";
import { getFoldersFromAPI } from "./utils/folderHelpers";
import { Doc } from "./utils/types";
import Unresponsive from "./templates/unresponsive";
import { sortNotesByDate, NoteListItem } from "./components/NoteComponents";
import { mapIconToHeroicon, mapColorToHex, getDefaultIconUrl } from "./utils/iconMapper";
import { toError } from "./utils/errorUtils";
import { getFolderNoteResults } from "./utils/searchUtils";

export default function Command() {
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const { folders, isLoading: foldersLoading } = useFolders();
  const { noteData, isLoading, hasError } = useGranolaData();
  const [foldersWithIds, setFoldersWithIds] = useState<typeof folders>([]);

  // Load document_ids lazily after initial render (for counting and filtering)
  // This defers loading IDs until after the UI is shown, reducing initial memory footprint
  useEffect(() => {
    if (folders.length === 0 || foldersWithIds.length > 0) {
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();

    // Load IDs after a short delay to allow UI to render first
    const timer = setTimeout(() => {
      const loadFolderIds = async () => {
        try {
          const foldersWithDocumentIds = await getFoldersFromAPI({
            includeDocumentIds: true,
            signal: abortController.signal,
          });
          if (!cancelled && !abortController.signal.aborted) {
            setFoldersWithIds(foldersWithDocumentIds);
          }
        } catch (error) {
          if (!cancelled && !abortController.signal.aborted) {
            showFailureToast(toError(error), { title: "Failed to load folder IDs" });
          }
        }
      };
      void loadFolderIds();
    }, 100); // 100ms delay to allow initial render

    return () => {
      cancelled = true;
      abortController.abort();
      clearTimeout(timer);
    };
  }, [folders, foldersWithIds.length]);

  // Use folders with IDs when available, otherwise use folders without IDs
  const activeFolders = foldersWithIds.length > 0 ? foldersWithIds : folders;

  // Optimized memoization: compute only what's needed, reuse arrays where possible
  const { filteredNotes, notesNotInFolders, folderNoteCounts } = useMemo(() => {
    const allNotes = noteData?.data?.docs || [];
    const foldersToProcess = activeFolders.length > 0 ? activeFolders : folders;
    return getFolderNoteResults(allNotes, foldersToProcess, selectedFolder);
  }, [noteData?.data?.docs, folders, activeFolders, selectedFolder]);

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
                      title={`${folder.title} (${folderNoteCounts[folder.id] ?? "..."})`}
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
          <NoteListItem key={doc.id} doc={doc} untitledNoteTitle={untitledNoteTitle} folders={activeFolders} />
        ))}
      </List>
    );
  }
}
