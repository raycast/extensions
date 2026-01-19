import { ActionPanel, Action, List, showToast, Toast, Icon, Color, open } from "@raycast/api";
import { useState, useMemo, useEffect, useRef } from "react";
import { useGranolaData } from "./utils/useGranolaData";
import { convertDocumentToMarkdown } from "./utils/convertJsonNodes";
import {
  sanitizeFileName,
  createExportFilename,
  openDownloadsFolder,
  createTempDirectory,
  writeExportFile,
  getDocumentFolderOrganization,
  calculateETA,
  formatProgressMessage,
  createZipArchive,
  cleanupTempDirectory,
  showExportSuccessToast,
} from "./utils/exportHelpers";
import { ExportService, type ExportResult } from "./utils/exportService";
import { useFolders } from "./utils/useFolders";
import { getFoldersFromAPI } from "./utils/folderHelpers";
import { mapIconToHeroicon, getDefaultIconUrl, mapColorToHex } from "./utils/iconMapper";
import { getDocumentPanelsBatch, getDocumentNotesMarkdownBatch } from "./utils/granolaApi";
import { getPanelId } from "./utils/getPanelId";
import { PanelsByDocId, Doc } from "./utils/types";
import convertHtmlToMarkdown from "./utils/convertHtmltoMarkdown";
import Unresponsive from "./templates/unresponsive";
import { sortNotesByDate } from "./components/NoteComponents";
import { toErrorMessage } from "./utils/errorUtils";
import { getNotionBatchSize } from "./utils/notionBatching";
import { getFolderNoteResults } from "./utils/searchUtils";

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
    return <BulkExportList notes={sortNotesByDate(noteData?.data?.docs || [])} untitledNoteTitle={untitledNoteTitle} />;
  }
}

function BulkExportList({ notes, untitledNoteTitle }: { notes: Doc[]; untitledNoteTitle: string }) {
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [bulkResults, setBulkResults] = useState<ExportResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [notionResults, setNotionResults] = useState<BulkNotionResult[]>([]);
  const [showNotionResults, setShowNotionResults] = useState(false);

  const { folders, isLoading: foldersLoading } = useFolders();
  const [foldersWithIds, setFoldersWithIds] = useState<typeof folders>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");

  // Track timeout IDs to prevent memory leaks
  const notionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notionOperationIdRef = useRef(0);
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
    const foldersToProcess = activeFolders.length > 0 ? activeFolders : folders;
    return getFolderNoteResults(notes, foldersToProcess, selectedFolder);
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

  const formatNoteAsMarkdown = (
    note: Doc,
    panels?: PanelsByDocId,
    preloadedNotesMarkdown?: Record<string, string>,
  ): string => {
    const title = note.title || untitledNoteTitle;
    const createdDate = new Date(note.created_at).toLocaleDateString();

    // Use pre-loaded notes markdown (much faster than fetching individually)
    const myNotes = preloadedNotesMarkdown?.[note.id] || "No personal notes available.";

    // Resolve enhanced notes from panels
    let enhancedNotes = "";
    if (panels && panels[note.id]) {
      const panelId = getPanelId(panels, note.id);
      if (panelId && panels[note.id][panelId]) {
        const panelData = panels[note.id][panelId];
        if (panelData.content) {
          enhancedNotes = convertDocumentToMarkdown(panelData.content);
        } else if (panelData.original_content) {
          // Convert HTML to markdown if it's HTML content
          enhancedNotes = convertHtmlToMarkdown(panelData.original_content);
        }
      }
    }

    // If no enhanced notes found, show a message
    if (!enhancedNotes.trim()) {
      enhancedNotes = "No enhanced notes available for this note.";
    }

    // Create well-formatted markdown
    return `# ${title}

## My Notes

${myNotes}

---

## Enhanced Notes

${enhancedNotes}

---

*Exported from Granola on ${new Date().toLocaleString()}*  
**Created:** ${createdDate} | **Source:** ${note.creation_source || "Unknown"}
`;
  };

  const exportSelectedNotes = async (noteIdsParam?: string[]) => {
    const noteIds = noteIdsParam ?? Array.from(selectedNoteIds);

    if (noteIds.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No notes selected",
        message: "Please select at least one note to export.",
      });
      return;
    }

    const noteIdsSetForLookup = new Set(noteIds);
    const selectedNotes = notes.filter((note) => noteIdsSetForLookup.has(note.id));

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Exporting notes",
      message: `Fetching enhanced notes for ${noteIds.length} notes...`,
    });

    try {
      // SMALL BATCH STREAMING: Process 5 notes at a time for speed, write immediately to limit memory
      const BATCH_SIZE = 5;
      const results: ExportResult[] = [];

      // Create temp directory and get folder organization upfront (lightweight)
      const tempDir = createTempDirectory("granola_export");
      const folderOrg = await getDocumentFolderOrganization(noteIds);

      const startTime = Date.now();
      let processedCount = 0;

      // Process notes in small batches
      for (let i = 0; i < selectedNotes.length; i += BATCH_SIZE) {
        const batch = selectedNotes.slice(i, i + BATCH_SIZE);
        const batchIds = batch.map((n) => n.id);

        // Calculate ETA based on elapsed time
        const elapsed = Date.now() - startTime;
        const avgTimePerNote = processedCount > 0 ? elapsed / processedCount : 500;
        const remainingNotes = noteIds.length - processedCount;
        const etaSeconds = Math.ceil((remainingNotes * avgTimePerNote) / 1000);
        const etaDisplay = etaSeconds > 60 ? `${Math.ceil(etaSeconds / 60)}m` : `${etaSeconds}s`;

        toast.message = `${processedCount}/${noteIds.length} • ~${etaDisplay}`;

        try {
          // Fetch data for this small batch in parallel
          const [batchPanels, batchNotesMarkdown] = await Promise.all([
            getDocumentPanelsBatch(batchIds, BATCH_SIZE),
            getDocumentNotesMarkdownBatch(batchIds, BATCH_SIZE),
          ]);

          // Immediately write each note to disk
          for (const note of batch) {
            try {
              const markdownContent = formatNoteAsMarkdown(note, batchPanels, batchNotesMarkdown);
              const safeTitle = sanitizeFileName(note.title || untitledNoteTitle);
              const fileName = `${safeTitle}_${note.id.substring(0, 8)}.md`;
              const folderName = folderOrg.documentToFolders[note.id];

              const relativePath = writeExportFile(tempDir, fileName, markdownContent, folderName);

              results.push({
                noteId: note.id,
                title: note.title || untitledNoteTitle,
                status: "success",
                fileName: relativePath,
                folderName,
              });
            } catch (error) {
              results.push({
                noteId: note.id,
                title: note.title || untitledNoteTitle,
                status: "error",
                error: toErrorMessage(error),
              });
            }
          }

          // Batch data written to disk, can be garbage collected
        } catch (error) {
          // If batch fetch fails, mark all notes in batch as error
          for (const note of batch) {
            results.push({
              noteId: note.id,
              title: note.title || untitledNoteTitle,
              status: "error",
              error: "Failed to fetch note data",
            });
          }
        }

        processedCount += batch.length;
      }

      setBulkResults(results);
      setShowResults(true);
      setSelectedNoteIds(new Set(noteIds));

      // Create zip from files already on disk
      toast.message = "Creating zip archive...";
      const zipFileName = createExportFilename("granola_export");
      await createZipArchive(tempDir, zipFileName);
      cleanupTempDirectory(tempDir);
      await showExportSuccessToast(noteIds.length);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Export failed";
      toast.message = toErrorMessage(error);
    }
  };

  const exportFilteredNotes = async () => {
    const targetIds = getFilteredNoteIds();
    if (targetIds.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No notes in current filter",
        message: "Try selecting a different folder before exporting.",
      });
      return;
    }

    setSelectedNoteIds(new Set(targetIds));
    await exportSelectedNotes(targetIds);
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

    const batchSize = getNotionBatchSize(noteIds.length);
    const initialEta = calculateETA(noteIds.length, batchSize);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving to Notion",
      message: `${noteIds.length} notes in batches of ${batchSize} (~${initialEta})`,
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

    if (notionTimeoutRef.current) {
      clearTimeout(notionTimeoutRef.current);
      notionTimeoutRef.current = null;
    }

    notionOperationIdRef.current += 1;
    const operationId = notionOperationIdRef.current;
    const isOperationActive = () => isMountedRef.current && notionOperationIdRef.current === operationId;

    // Conservative batch processing with proper error handling
    const BATCH_SIZE = getNotionBatchSize(selectedNotes.length);
    let processedCount = 0;

    // Process in batches with real-time progress updates
    for (let i = 0; i < selectedNotes.length; i += BATCH_SIZE) {
      if (!isOperationActive()) break; // Stop processing if component unmounted or superseded

      const batch = selectedNotes.slice(i, i + BATCH_SIZE);

      // Process batch in parallel with detailed error handling
      const batchPromises = batch.map(async (note) => {
        if (!isOperationActive()) return { success: false, noteId: note.id };
        try {
          const { saveToNotionWithRetry } = await import("./utils/granolaApi");
          const result = await saveToNotionWithRetry(note.id, {
            maxRetries: 2,
            onRetry: (attempt, delayMs) => {
              if (isOperationActive()) {
                toast.message = `Rate limited, retrying in ${Math.ceil(delayMs / 1000)}s (attempt ${attempt})`;
              }
            },
          });

          // Only update state if component is still mounted
          if (isOperationActive()) {
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
          if (!isOperationActive()) return { success: false, noteId: note.id };
          // Extract detailed error information
          let errorMessage = toErrorMessage(error);
          let errorDetails = errorMessage;

          if (error instanceof Error) {
            errorMessage = error.message;
            const lowerMessage = error.message.toLowerCase();
            const status = (error as { status?: number }).status;
            if (error.message.includes("Internal Server Error")) {
              errorDetails = `HTTP 500 - This specific note may have invalid data or the Granola API is temporarily unavailable. Note ID: ${note.id}`;
            } else if (
              status === 429 ||
              lowerMessage.includes("rate limit") ||
              lowerMessage.includes("rate_limit") ||
              lowerMessage.includes("ratelimit") ||
              lowerMessage.includes("too many requests")
            ) {
              errorDetails = `Rate limited - too many requests. Note ID: ${note.id}`;
            } else if (lowerMessage.includes("unauthorized")) {
              errorDetails = `Authentication failed - check Granola app connection. Note ID: ${note.id}`;
            }
          }

          // Only update state if component is still mounted
          if (isOperationActive()) {
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
      if (!isOperationActive()) break; // Stop if component unmounted or superseded

      processedCount += batch.length;

      // Update toast with accurate count and ETA
      if (isOperationActive()) {
        const remainingItems = selectedNotes.length - processedCount;
        const eta = remainingItems > 0 ? calculateETA(remainingItems, BATCH_SIZE) : undefined;
        toast.message = formatProgressMessage(processedCount, selectedNotes.length, eta);
      }
    }

    // Final results summary - store timeout ID in ref for cleanup
    if (notionTimeoutRef.current) {
      clearTimeout(notionTimeoutRef.current);
    }
    notionTimeoutRef.current = setTimeout(() => {
      if (!isOperationActive()) return; // Don't update state if component unmounted or superseded
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

  const saveFilteredToNotion = async () => {
    const targetIds = getFilteredNoteIds();
    if (targetIds.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No notes in current filter",
        message: "Try selecting a different folder before saving to Notion.",
      });
      return;
    }

    setSelectedNoteIds(new Set(targetIds));
    await saveSelectedToNotion(targetIds);
  };

  if (showResults) {
    return (
      <BulkExportResults
        results={bulkResults}
        onBackToSelection={() => setShowResults(false)}
        notes={notes}
        getFolderNamesForNote={getFolderNamesForNote}
      />
    );
  }

  if (showNotionResults) {
    return <BulkNotionResults results={notionResults} onBackToSelection={() => setShowNotionResults(false)} />;
  }

  const navigationTitle =
    selectedFolder === "all"
      ? `Export Notes (${selectedNoteIds.size} selected)`
      : `Export Notes (${selectedNoteIds.size} selected) – ${filterLabel}`;

  const searchPlaceholder =
    selectedFolder === "all"
      ? "Search notes to select for export..."
      : selectedFolder === "orphans"
        ? "Search notes not in folders..."
        : `Search notes in ${filterLabel}...`;

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
                title={`Export ${selectedNoteIds.size} Notes to Zip`}
                icon={Icon.ArrowDown}
                onAction={() => exportSelectedNotes()}
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
            title={
              selectedFolder === "all"
                ? `Export ${filteredNotes.length} Notes to Zip`
                : `Export ${filteredNotes.length} from ${filterLabel} to Zip`
            }
            icon={Icon.ArrowDown}
            onAction={exportFilteredNotes}
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
                        ? `Export ${selectedNoteIds.size} Selected to Zip`
                        : "Export This Note to Zip"
                    }
                    icon={Icon.ArrowDown}
                    onAction={() => (selectedNoteIds.size > 0 ? exportSelectedNotes() : exportSelectedNotes([note.id]))}
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
                    title={
                      selectedFolder === "all"
                        ? `Export All ${filteredNotes.length} to Zip`
                        : `Export All from ${filterLabel}`
                    }
                    icon={Icon.Download}
                    onAction={exportFilteredNotes}
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

function BulkExportResults({
  results,
  onBackToSelection,
  notes,
  getFolderNamesForNote,
}: {
  results: ExportResult[];
  onBackToSelection: () => void;
  notes: Doc[];
  getFolderNamesForNote: (noteId: string) => string[];
}) {
  const { successResults, errorResults } = ExportService.getExportStats(results);
  const pendingResults = results.filter((r) => r.status === "pending");

  const noteMap = useMemo(() => {
    const map = new Map<string, Doc>();
    notes.forEach((note) => {
      map.set(note.id, note);
    });
    return map;
  }, [notes]);

  return (
    <List
      navigationTitle={`Export Results (${successResults.length}/${results.length} successful)`}
      searchBarPlaceholder="Search export results..."
      actions={
        <ActionPanel>
          <Action
            title="Open Downloads Folder"
            icon={Icon.Folder}
            onAction={openDownloadsFolder}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
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
          {pendingResults.map((result) => {
            const folderNames =
              getFolderNamesForNote(result.noteId) || (result.folderName ? [result.folderName] : undefined) || [];

            const accessories = [];

            if (folderNames.length > 0) {
              accessories.push({
                text: folderNames.join(", "),
                icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
              });
            }

            accessories.push({ text: "Processing..." });

            return (
              <List.Item
                key={result.noteId}
                title={result.title}
                icon={{ source: Icon.Clock, tintColor: Color.Yellow }}
                accessories={accessories}
              />
            );
          })}
        </List.Section>
      )}

      {successResults.length > 0 && (
        <List.Section title={`Successfully Exported (${successResults.length})`}>
          {successResults.map((result) => {
            const folderNames =
              getFolderNamesForNote(result.noteId) || (result.folderName ? [result.folderName] : undefined) || [];
            const note = noteMap.get(result.noteId);

            const accessories = [];

            if (folderNames.length > 0) {
              accessories.push({
                text: folderNames.join(", "),
                icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
              });
            }

            if (note) {
              accessories.push({ text: formatDate(note.created_at) });
            }

            if (result.fileSize) {
              accessories.push({ text: `${Math.round(result.fileSize / 1000)}k chars` });
            } else {
              accessories.push({ text: "Exported" });
            }

            return (
              <List.Item
                key={result.noteId}
                title={result.title}
                subtitle={result.fileName}
                icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                accessories={accessories}
              />
            );
          })}
        </List.Section>
      )}

      {errorResults.length > 0 && (
        <List.Section title={`Failed (${errorResults.length})`}>
          {errorResults.map((result) => {
            const folderNames =
              getFolderNamesForNote(result.noteId) || (result.folderName ? [result.folderName] : undefined) || [];
            const note = noteMap.get(result.noteId);

            const accessories = [];

            if (folderNames.length > 0) {
              accessories.push({
                text: folderNames.join(", "),
                icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
              });
            }

            if (note) {
              accessories.push({ text: formatDate(note.created_at) });
            }

            accessories.push({ text: "Failed" });

            return (
              <List.Item
                key={result.noteId}
                title={result.title}
                subtitle={result.error || "Unknown error"}
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Error Details"
                      icon={Icon.ExclamationMark}
                      onAction={() => {
                        showToast({
                          style: Toast.Style.Failure,
                          title: `Error: ${result.title}`,
                          message: result.error || "Unknown error",
                        });
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
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
