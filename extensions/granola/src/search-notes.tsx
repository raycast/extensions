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
            showFailureToast({ title: "Failed to load folder IDs", message: String(error) });
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
    if (allNotes.length === 0) {
      return {
        filteredNotes: [],
        notesNotInFolders: [],
        folderNoteCounts: {} as Record<string, number>,
      };
    }

    // Create noteIds Set only once
    const noteIds = new Set<string>();
    for (let i = 0; i < allNotes.length; i++) {
      noteIds.add(allNotes[i].id);
    }

    const notesInFolders = new Set<string>();
    const counts: Record<string, number> = {};

    // Use folders with IDs if available, otherwise use folders without IDs
    const foldersToProcess = activeFolders.length > 0 ? activeFolders : folders;

    // Process folders efficiently
    for (let i = 0; i < foldersToProcess.length; i++) {
      const folder = foldersToProcess[i];
      // Compute counts from document_ids array (from API) by intersecting with currently loaded documents
      // Only process if folder has document_ids loaded (memory optimization)
      if (folder.document_ids && folder.document_ids.length > 0) {
        let count = 0;
        for (let j = 0; j < folder.document_ids.length; j++) {
          const id = folder.document_ids[j];
          if (noteIds.has(id)) {
            count++;
            notesInFolders.add(id);
          }
        }
        counts[folder.id] = count;
      } else {
        counts[folder.id] = 0;
      }
    }

    // Compute orphan notes efficiently
    const orphanNotes: Doc[] = [];
    for (let i = 0; i < allNotes.length; i++) {
      if (!notesInFolders.has(allNotes[i].id)) {
        orphanNotes.push(allNotes[i]);
      }
    }

    // Compute filtered notes based on selection
    let filtered: Doc[];
    if (selectedFolder === "all") {
      filtered = allNotes; // Reuse existing array
    } else if (selectedFolder === "orphans") {
      filtered = orphanNotes; // Reuse computed array
    } else {
      const folder = foldersToProcess.find((f) => f.id === selectedFolder);
      if (!folder || !folder.document_ids) {
        filtered = [];
      } else {
        // Filter efficiently
        filtered = [];
        const folderDocIds = new Set(folder.document_ids);
        for (let i = 0; i < allNotes.length; i++) {
          if (folderDocIds.has(allNotes[i].id)) {
            filtered.push(allNotes[i]);
          }
        }
      }
    }

    return {
      filteredNotes: filtered,
      notesNotInFolders: orphanNotes,
      folderNoteCounts: counts,
    };
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
