import { ActionPanel, Action, List, showToast, Toast, Icon, Color, open } from "@raycast/api";
import { useState, useMemo, useEffect, useRef } from "react";
import { useGranolaData } from "./utils/useGranolaData";
import { getTranscript } from "./utils/fetchData";
import { useFolders } from "./utils/useFolders";
import { getFoldersFromAPI } from "./utils/folderHelpers";
import { mapIconToHeroicon, getDefaultIconUrl, mapColorToHex } from "./utils/iconMapper";
import { sanitizeFileName, createExportFilename, showExportSuccessToast } from "./utils/exportHelpers";
import { ExportService } from "./utils/exportService";

import { Doc } from "./utils/types";
import Unresponsive from "./templates/unresponsive";
import { sortNotesByDate } from "./components/NoteComponents";

interface BulkNotionResult {
  noteId: string;
  title: string;
  status: "success" | "error" | "pending";
  pageUrl?: string;
  error?: string;
  errorDetails?: string;
}

const formatDate = (value?: string): string => {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString();
};

export default function Command() {
  const { noteData, isLoading, hasError } = useGranolaData();

  // Handle loading and error states
  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (hasError) {
    return <Unresponsive />;
  }

  const untitledNoteTitle = "Untitled Note";

  if (noteData?.data) {
    return (
      <BulkTranscriptsList notes={sortNotesByDate(noteData?.data?.docs || [])} untitledNoteTitle={untitledNoteTitle} />
    );
  }
}

function BulkTranscriptsList({ notes, untitledNoteTitle }: { notes: Doc[]; untitledNoteTitle: string }) {
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [notionResults, setNotionResults] = useState<BulkNotionResult[]>([]);
  const [showNotionResults, setShowNotionResults] = useState(false);

  const { folders, isLoading: foldersLoading } = useFolders();
  const [foldersWithIds, setFoldersWithIds] = useState<typeof folders>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");

  // Track timeout IDs and mount status to prevent memory leaks
  const notionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

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
        const foldersWithDocumentIds = await getFoldersFromAPI({
          includeDocumentIds: true,
          signal: abortController.signal,
        });
        if (!cancelled && !abortController.signal.aborted) {
          setFoldersWithIds(foldersWithDocumentIds);
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

  // Cleanup timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (notionTimeoutRef.current) {
        clearTimeout(notionTimeoutRef.current);
        notionTimeoutRef.current = null;
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
    };
  }, []);

  // Use folders with IDs when available, otherwise use folders without IDs
  const activeFolders = foldersWithIds.length > 0 ? foldersWithIds : folders;

  // Helper function to get folder names for a specific note (on-demand lookup instead of precomputing all mappings)
  const getFolderNamesForNote = useMemo(() => {
    // Use folders with IDs if available, otherwise use folders without IDs
    const foldersToProcess = activeFolders.length > 0 ? activeFolders : folders;
    return (noteId: string): string[] => {
      const folderNames: string[] = [];
      for (let i = 0; i < foldersToProcess.length; i++) {
        const folder = foldersToProcess[i];
        // Only check if folder has document_ids loaded (memory optimization)
        if (folder.document_ids && folder.document_ids.length > 0) {
          // Check if this note is in this folder
          for (let j = 0; j < folder.document_ids.length; j++) {
            if (folder.document_ids[j] === noteId) {
              folderNames.push(folder.title);
              break; // Note can only be in a folder once
            }
          }
        }
      }
      return folderNames;
    };
  }, [folders, activeFolders]);

  // Combine all folder-related computations into a single useMemo (like search-notes.tsx)
  // This reduces memory overhead by computing only what's needed and reusing data structures
  const { filteredNotes, notesNotInFolders, folderNoteCounts } = useMemo(() => {
    if (notes.length === 0) {
      return {
        filteredNotes: [],
        notesNotInFolders: [],
        folderNoteCounts: {} as Record<string, number>,
      };
    }

    // Create noteIds Set only once
    const noteIds = new Set<string>();
    for (let i = 0; i < notes.length; i++) {
      noteIds.add(notes[i].id);
    }

    // Use folders with IDs if available, otherwise use folders without IDs
    const foldersToProcess = activeFolders.length > 0 ? activeFolders : folders;

    const notesInFolders = new Set<string>();
    const counts: Record<string, number> = {};

    // Process folders efficiently
    for (let i = 0; i < foldersToProcess.length; i++) {
      const folder = foldersToProcess[i];
      // Only process if folder has document_ids loaded (memory optimization)
      if (folder.document_ids && folder.document_ids.length > 0) {
        let count = 0;
        const docIds = folder.document_ids;
        for (let j = 0; j < docIds.length; j++) {
          const id = docIds[j];
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
    for (let i = 0; i < notes.length; i++) {
      if (!notesInFolders.has(notes[i].id)) {
        orphanNotes.push(notes[i]);
      }
    }

    // Compute filtered notes based on selection (create Set on-demand only when needed)
    let filtered: Doc[];
    if (selectedFolder === "all") {
      filtered = notes; // Reuse existing array
    } else if (selectedFolder === "orphans") {
      filtered = orphanNotes; // Reuse computed array
    } else {
      const folder = foldersToProcess.find((f) => f.id === selectedFolder);
      if (!folder || !folder.document_ids) {
        filtered = [];
      } else {
        // Filter efficiently - create Set only for the selected folder
        filtered = [];
        const folderDocIds = new Set(folder.document_ids);
        for (let i = 0; i < notes.length; i++) {
          if (folderDocIds.has(notes[i].id)) {
            filtered.push(notes[i]);
          }
        }
      }
    }

    return {
      filteredNotes: filtered,
      notesNotInFolders: orphanNotes,
      folderNoteCounts: counts,
    };
  }, [notes, folders, activeFolders, selectedFolder]);

  // Compute filteredNoteIds on-demand instead of memoizing (only used in a few places)
  const getFilteredNoteIds = () => {
    const ids: string[] = [];
    for (let i = 0; i < filteredNotes.length; i++) {
      ids.push(filteredNotes[i].id);
    }
    return ids;
  };

  const currentFolderLabel = useMemo(() => {
    if (selectedFolder === "all") {
      return null;
    }
    if (selectedFolder === "orphans") {
      return "Notes Not in Folders";
    }
    // Use folders with IDs if available, otherwise use folders without IDs
    const foldersToSearch = activeFolders.length > 0 ? activeFolders : folders;
    const match = foldersToSearch.find((folder) => folder.id === selectedFolder);
    return match?.title || null;
  }, [selectedFolder, folders, activeFolders]);

  const filterLabel = useMemo(() => {
    if (selectedFolder === "all") {
      return "All Notes";
    }
    if (selectedFolder === "orphans") {
      return "Notes Not in Folders";
    }
    return currentFolderLabel || "Selected Folder";
  }, [selectedFolder, currentFolderLabel]);

  const toggleNoteSelection = (noteId: string) => {
    const newSelection = new Set(selectedNoteIds);
    if (newSelection.has(noteId)) {
      newSelection.delete(noteId);
    } else {
      newSelection.add(noteId);
    }
    setSelectedNoteIds(newSelection);
  };

  const selectAllNotes = () => {
    setSelectedNoteIds(new Set(getFilteredNoteIds()));
  };

  const clearSelection = () => {
    setSelectedNoteIds(new Set());
  };

  const saveSelectedToNotion = async (noteIdsParam?: string[]) => {
    const noteIds = noteIdsParam ?? Array.from(selectedNoteIds);

    if (noteIds.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No notes selected",
        message: "Please select at least one note to save to Notion.",
      });
      return;
    }

    const noteIdsSetForLookup = new Set(noteIds);

    // Conservative batch sizing for Notion API stability
    const getNotionBatchSize = (totalNotes: number): number => {
      if (totalNotes <= 5) return 1; // Very small: sequential
      if (totalNotes <= 20) return 3; // Small: 3 per batch
      if (totalNotes <= 50) return 5; // Medium: 5 per batch
      return 7; // Large: 7 per batch (conservative for API stability)
    };

    const batchSize = getNotionBatchSize(noteIds.length);
    const estimatedBatches = Math.ceil(noteIds.length / batchSize);
    const estimatedTimeSeconds = estimatedBatches * 2.5; // ~2.5s per batch (800ms delay + API time + safety margin)
    const timeDisplay =
      estimatedTimeSeconds > 60
        ? `~${Math.ceil(estimatedTimeSeconds / 60)} minutes`
        : `~${Math.ceil(estimatedTimeSeconds)} seconds`;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving to Notion",
      message: `${noteIds.length} notes in batches of ${batchSize} (${timeDisplay})`,
    });

    const selectedNotes = notes.filter((note) => noteIdsSetForLookup.has(note.id));

    // Initialize results with pending status for interactive UI
    const initialResults: BulkNotionResult[] = selectedNotes.map((note) => ({
      noteId: note.id,
      title: note.title || untitledNoteTitle,
      status: "pending",
    }));

    setNotionResults(initialResults);
    setShowNotionResults(true);

    // Conservative batch processing with proper error handling
    const BATCH_SIZE = getNotionBatchSize(selectedNotes.length);
    let processedCount = 0;

    // Process in batches with real-time progress updates
    for (let i = 0; i < selectedNotes.length; i += BATCH_SIZE) {
      if (!isMountedRef.current) break; // Stop processing if component unmounted

      const batch = selectedNotes.slice(i, i + BATCH_SIZE);

      // Process batch in parallel with detailed error handling
      const batchPromises = batch.map(async (note) => {
        if (!isMountedRef.current) return { success: false, noteId: note.id };
        try {
          const { saveToNotion } = await import("./utils/granolaApi");
          const result = await saveToNotion(note.id);

          // Only update state if component is still mounted
          if (isMountedRef.current) {
            setNotionResults((prev) =>
              prev.map((r) =>
                r.noteId === note.id
                  ? {
                      ...r,
                      status: "success" as const,
                      pageUrl: result.page_url,
                    }
                  : r,
              ),
            );
          }
          return { success: true, noteId: note.id };
        } catch (error) {
          if (!isMountedRef.current) return { success: false, noteId: note.id };
          // Extract detailed error information
          let errorMessage = "Unknown error";
          let errorDetails = String(error);

          if (error instanceof Error) {
            errorMessage = error.message;
            if (error.message.includes("Internal Server Error")) {
              errorDetails = `HTTP 500 - This specific note may have invalid data or the Granola API is temporarily unavailable. Note ID: ${note.id}`;
            } else if (error.message.includes("rate limit")) {
              errorDetails = `Rate limited - too many requests. Note ID: ${note.id}`;
            } else if (error.message.includes("unauthorized")) {
              errorDetails = `Authentication failed - check Granola app connection. Note ID: ${note.id}`;
            }
          }

          // Only update state if component is still mounted
          if (isMountedRef.current) {
            setNotionResults((prev) =>
              prev.map((r) =>
                r.noteId === note.id
                  ? {
                      ...r,
                      status: "error" as const,
                      error: errorMessage,
                      errorDetails: errorDetails,
                    }
                  : r,
              ),
            );
          }

          return { success: false, noteId: note.id };
        }
      });

      // Wait for the batch to complete then update progress
      await Promise.all(batchPromises);
      if (!isMountedRef.current) break; // Stop if component unmounted

      processedCount += batch.length;

      // Update progress with dynamic ETA after the batch completes
      const remainingNotes = selectedNotes.length - processedCount;
      const remainingBatches = Math.ceil(remainingNotes / BATCH_SIZE);
      const etaSeconds = remainingBatches * 2.5; // 2.5s per batch estimate
      const etaDisplay = etaSeconds > 60 ? `${Math.ceil(etaSeconds / 60)}m` : `${Math.ceil(etaSeconds)}s`;

      // Update toast with accurate count
      if (isMountedRef.current) {
        toast.message = `${processedCount}/${selectedNotes.length} • ~${etaDisplay}`;
      }

      // Conservative delay between batches
      if (i + BATCH_SIZE < selectedNotes.length) {
        // Clear any existing timeout before creating a new one
        if (batchTimeoutRef.current) {
          clearTimeout(batchTimeoutRef.current);
        }
        await new Promise<void>((resolve) => {
          batchTimeoutRef.current = setTimeout(() => {
            batchTimeoutRef.current = null;
            resolve();
          }, 800);
        });
      }
    }

    // Final results summary - store timeout ID in ref for cleanup
    if (notionTimeoutRef.current) {
      clearTimeout(notionTimeoutRef.current);
    }
    notionTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return; // Don't update state if component unmounted
      setNotionResults((currentResults) => {
        const successCount = currentResults.filter((r) => r.status === "success").length;
        const errorCount = currentResults.length - successCount;

        showToast({
          style: errorCount > 0 ? Toast.Style.Failure : Toast.Style.Success,
          title: "Notion save complete",
          message: `${successCount} successful, ${errorCount} failed`,
          primaryAction:
            successCount > 0
              ? {
                  title: "Open First Note",
                  onAction: () => {
                    const firstSuccess = currentResults.find((r) => r.status === "success");
                    if (firstSuccess?.pageUrl) {
                      open(firstSuccess.pageUrl);
                    }
                  },
                }
              : undefined,
        });

        return currentResults;
      });
      notionTimeoutRef.current = null; // Clear ref after timeout executes
    }, 100);
  };

  const exportSelectedTranscriptsToZip = async (noteIdsParam?: string[]) => {
    const noteIds = noteIdsParam ?? Array.from(selectedNoteIds);

    if (noteIds.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No notes selected",
        message: "Please select at least one note to export transcripts.",
      });
      return;
    }

    const noteIdSetForLookup = new Set(noteIds);
    const selectedNotes = notes.filter((note) => noteIdSetForLookup.has(note.id));

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Exporting transcripts to zip",
      message: `Processing ${noteIds.length} transcripts...`,
    });

    try {
      // Use shared ExportService for batch processing - retrieves transcripts directly during export
      const { tempDir } = await ExportService.processBatchExport(
        selectedNotes,
        async (note) => {
          // Retrieve transcript directly during export (no middleman step)
          const transcript = await getTranscript(note.id);

          // Find the note data for metadata
          const createdDate = note.created_at ? new Date(note.created_at).toLocaleDateString() : "Unknown";
          const source = note.creation_source || "Unknown";

          // Format transcript content
          const transcriptContent = `# ${note.title || "Untitled"}

## Transcript

${transcript}

---

*Exported from Granola on ${new Date().toLocaleString()}*  
**Created:** ${createdDate} | **Source:** ${source}
`;

          const safeTitle = sanitizeFileName(note.title || "Untitled");
          const fileName = `${safeTitle}_${note.id.substring(0, 8)}.md`;

          return {
            content: transcriptContent,
            fileName,
          };
        },
        {
          filePrefix: "granola_transcripts",
          includeOrganization: true,
        },
        (processed, total, eta) => {
          toast.message = `${processed}/${total} • ~${eta}`;
        },
      );

      // Create and download zip
      const zipFileName = createExportFilename("granola_transcripts");
      await ExportService.createAndDownloadZip(tempDir, zipFileName);
      await showExportSuccessToast(noteIds.length);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Export failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  const exportFilteredTranscriptsToZip = async () => {
    const targetIds = getFilteredNoteIds();
    if (targetIds.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No notes in current filter",
        message: `Try selecting a different folder before exporting transcripts.`,
      });
      return;
    }

    setSelectedNoteIds(new Set(targetIds));
    await exportSelectedTranscriptsToZip(targetIds);
  };

  const saveFilteredToNotion = async () => {
    const targetIds = getFilteredNoteIds();
    if (targetIds.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No notes in current filter",
        message: `Try selecting a different folder before saving to Notion.`,
      });
      return;
    }

    setSelectedNoteIds(new Set(targetIds));
    await saveSelectedToNotion(targetIds);
  };

  const navigationTitle =
    selectedFolder === "all"
      ? `Export Transcripts (${selectedNoteIds.size} selected)`
      : `Export Transcripts (${selectedNoteIds.size} selected) – ${filterLabel}`;

  const searchPlaceholder =
    selectedFolder === "all"
      ? "Search notes to select for export..."
      : selectedFolder === "orphans"
        ? "Search notes not in folders..."
        : `Search notes in ${filterLabel}...`;

  if (showNotionResults) {
    return <BulkNotionResults results={notionResults} onBackToSelection={() => setShowNotionResults(false)} />;
  }

  return (
    <List
      navigationTitle={navigationTitle}
      searchBarPlaceholder={searchPlaceholder}
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
                .sort((a, b) => a.title.localeCompare(b.title))
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
      actions={
        <ActionPanel>
          {selectedNoteIds.size > 0 && (
            <>
              <Action
                title={`Export ${selectedNoteIds.size} Transcripts to Zip`}
                icon={Icon.ArrowDown}
                onAction={() => exportSelectedTranscriptsToZip()}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                title={`Save ${selectedNoteIds.size} to Notion`}
                icon={Icon.Document}
                onAction={() => saveSelectedToNotion()}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title="Clear Selection"
                icon={Icon.XMarkCircle}
                onAction={clearSelection}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </>
          )}
          <Action
            title={selectedFolder === "all" ? `Export All Transcripts to Zip` : `Export All from ${filterLabel} to Zip`}
            icon={Icon.ArrowDown}
            onAction={exportFilteredTranscriptsToZip}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          />
          <Action
            title={
              selectedFolder === "all"
                ? `Save ${filteredNotes.length} Notes to Notion`
                : `Save ${filteredNotes.length} from ${filterLabel} to Notion`
            }
            icon={Icon.Document}
            onAction={saveFilteredToNotion}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
          <Action
            title={
              selectedFolder === "all"
                ? `Select All Notes (${filteredNotes.length})`
                : `Select All in ${filterLabel} (${filteredNotes.length})`
            }
            icon={Icon.CheckCircle}
            onAction={selectAllNotes}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          />
        </ActionPanel>
      }
    >
      {sortNotesByDate(filteredNotes).map((note) => {
        const folderNames = getFolderNamesForNote(note.id);
        const accessories: List.Item.Accessory[] = [];

        // Date as first accessory (matching search-notes.tsx)
        accessories.push({ text: formatDate(note.created_at) });

        // Folder icon as second accessory (matching search-notes.tsx)
        if (folderNames.length > 0) {
          // Find the first folder to get its icon
          const firstFolderName = folderNames[0];
          const foldersToSearch = activeFolders.length > 0 ? activeFolders : folders;
          const noteFolder = foldersToSearch.find((f) => f.title === firstFolderName);

          if (noteFolder) {
            accessories.push({
              icon: {
                source: noteFolder.icon ? mapIconToHeroicon(noteFolder.icon.value) : getDefaultIconUrl(),
                tintColor: noteFolder.icon ? mapColorToHex(noteFolder.icon.color) : Color.Blue,
              },
              tooltip:
                folderNames.length > 1 ? `In folders: ${folderNames.join(", ")}` : `In folder: ${firstFolderName}`,
            });
          } else {
            accessories.push({
              icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
              tooltip:
                folderNames.length > 1 ? `In folders: ${folderNames.join(", ")}` : `In folder: ${firstFolderName}`,
            });
          }
        } else {
          // Show "No folder" indicator for orphaned notes (matching search-notes.tsx)
          accessories.push({
            icon: { source: Icon.Document, tintColor: Color.SecondaryText },
            tooltip: "Not in any folder",
          });
        }

        // Privacy indicator as third accessory (matching search-notes.tsx)
        accessories.push({
          text: note.public ? "Public" : "Private",
        });

        return (
          <List.Item
            key={note.id}
            title={note.title ?? untitledNoteTitle}
            icon={{
              source: selectedNoteIds.has(note.id) ? Icon.CheckCircle : Icon.Circle,
              tintColor: selectedNoteIds.has(note.id) ? Color.Green : Color.SecondaryText,
            }}
            accessories={accessories}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Selection">
                  <Action
                    title={selectedNoteIds.has(note.id) ? "Deselect Note" : "Select Note"}
                    icon={selectedNoteIds.has(note.id) ? Icon.XMarkCircle : Icon.CheckCircle}
                    onAction={() => toggleNoteSelection(note.id)}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                  <Action
                    title={
                      selectedFolder === "all"
                        ? `Select All (${filteredNotes.length})`
                        : `Select All in ${filterLabel} (${filteredNotes.length})`
                    }
                    icon={Icon.CheckCircle}
                    onAction={selectAllNotes}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  />
                  {selectedNoteIds.size > 0 && (
                    <Action
                      title={`Clear Selection (${selectedNoteIds.size})`}
                      icon={Icon.XMarkCircle}
                      onAction={clearSelection}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Export">
                  <Action
                    title={
                      selectedNoteIds.size > 0
                        ? `Export ${selectedNoteIds.size} Selected Transcripts`
                        : "Export This Transcript to Zip"
                    }
                    icon={Icon.ArrowDown}
                    onAction={() =>
                      selectedNoteIds.size > 0
                        ? exportSelectedTranscriptsToZip()
                        : exportSelectedTranscriptsToZip([note.id])
                    }
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                  <Action
                    title={
                      selectedNoteIds.size > 0
                        ? `Save ${selectedNoteIds.size} Selected to Notion`
                        : "Save This Note to Notion"
                    }
                    icon={Icon.Document}
                    onAction={() =>
                      selectedNoteIds.size > 0 ? saveSelectedToNotion() : saveSelectedToNotion([note.id])
                    }
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title={selectedFolder === "all" ? `Export All Transcripts` : `Export All from ${filterLabel}`}
                    icon={Icon.Download}
                    onAction={exportFilteredTranscriptsToZip}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  />
                  <Action
                    title={
                      selectedFolder === "all"
                        ? `Save All ${filteredNotes.length} to Notion`
                        : `Save All from ${filterLabel}`
                    }
                    icon={Icon.Document}
                    onAction={saveFilteredToNotion}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function BulkNotionResults({
  results,
  onBackToSelection,
}: {
  results: BulkNotionResult[];
  onBackToSelection: () => void;
}) {
  const successResults = results.filter((r) => r.status === "success");
  const errorResults = results.filter((r) => r.status === "error");
  const pendingResults = results.filter((r) => r.status === "pending");

  return (
    <List
      navigationTitle={`Notion Results (${successResults.length}/${results.length} successful)`}
      searchBarPlaceholder="Search Notion save results..."
      actions={
        <ActionPanel>
          {successResults.length > 0 && (
            <Action
              title="Open First Note"
              icon={Icon.Globe}
              onAction={() => {
                const firstSuccess = successResults[0];
                if (firstSuccess?.pageUrl) {
                  open(firstSuccess.pageUrl);
                }
              }}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
          <Action
            title="Back to Note Selection"
            icon={Icon.ArrowLeft}
            onAction={onBackToSelection}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
        </ActionPanel>
      }
    >
      {pendingResults.length > 0 && (
        <List.Section title="Processing...">
          {pendingResults.map((result) => (
            <List.Item
              key={result.noteId}
              title={result.title}
              icon={{ source: Icon.Clock, tintColor: Color.Yellow }}
              accessories={[{ text: "Saving..." }]}
            />
          ))}
        </List.Section>
      )}

      {successResults.length > 0 && (
        <List.Section title={`Successfully Saved (${successResults.length})`}>
          {successResults.map((result) => (
            <List.Item
              key={result.noteId}
              title={result.title}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              accessories={[{ text: "Saved to Notion" }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open in Notion"
                    icon={Icon.Globe}
                    onAction={() => {
                      if (result.pageUrl) {
                        open(result.pageUrl);
                      }
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Notion URL"
                    content={result.pageUrl || ""}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {errorResults.length > 0 && (
        <List.Section title={`Failed (${errorResults.length})`}>
          {errorResults.map((result) => (
            <List.Item
              key={result.noteId}
              title={result.title}
              subtitle={result.error || "Unknown error"}
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              accessories={[{ text: "Failed" }]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Error Details"
                    icon={Icon.ExclamationMark}
                    onAction={() => {
                      showToast({
                        style: Toast.Style.Failure,
                        title: `Error: ${result.title}`,
                        message: result.errorDetails || result.error || "Unknown error",
                      });
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Error Details"
                    content={result.errorDetails || result.error || "Unknown error"}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
