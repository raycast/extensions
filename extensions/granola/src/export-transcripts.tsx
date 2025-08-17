import { ActionPanel, Action, List, showToast, Toast, Detail, Icon, Color, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { useGranolaData } from "./utils/useGranolaData";
import { getTranscript } from "./utils/fetchData";
import { getDocumentToFolderMapping } from "./utils/folderHelpers";
import {
  sanitizeFileName,
  createExportFilename,
  getDynamicBatchSize,
  calculateETA,
  formatProgressMessage,
} from "./utils/exportHelpers";
import { ExportService, type ExportResult } from "./utils/exportService";

import { Doc } from "./utils/types";
import Unresponsive from "./templates/unresponsive";
import { sortNotesByDate } from "./components/NoteComponents";

interface BulkTranscriptResult extends ExportResult {
  transcriptPreview: string; // Only a tiny preview for display
  transcriptLength?: number; // Just the character count
  id: string; // Alias for noteId to satisfy ExportableItem interface
}

interface BulkNotionResult {
  noteId: string;
  title: string;
  status: "success" | "error" | "pending";
  pageUrl?: string;
  error?: string;
  errorDetails?: string;
}

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

  const [bulkResults, setBulkResults] = useState<BulkTranscriptResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [notionResults, setNotionResults] = useState<BulkNotionResult[]>([]);
  const [showNotionResults, setShowNotionResults] = useState(false);

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
    setSelectedNoteIds(new Set(notes.map((note) => note.id)));
  };

  const clearSelection = () => {
    setSelectedNoteIds(new Set());
  };

  const saveSelectedToNotion = async () => {
    if (selectedNoteIds.size === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No notes selected",
        message: "Please select at least one note to save to Notion.",
      });
      return;
    }

    if (selectedNoteIds.size > 500) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Too many notes",
        message: "Please select 500 or fewer notes for Notion saving.",
      });
      return;
    }

    const selectedNoteIdsArray = Array.from(selectedNoteIds);

    // Conservative batch sizing for Notion API stability
    const getNotionBatchSize = (totalNotes: number): number => {
      if (totalNotes <= 5) return 1; // Very small: sequential
      if (totalNotes <= 20) return 3; // Small: 3 per batch
      if (totalNotes <= 50) return 5; // Medium: 5 per batch
      return 7; // Large: 7 per batch (conservative for API stability)
    };

    const batchSize = getNotionBatchSize(selectedNoteIdsArray.length);
    const estimatedBatches = Math.ceil(selectedNoteIdsArray.length / batchSize);
    const estimatedTimeSeconds = estimatedBatches * 2.5; // ~2.5s per batch (800ms delay + API time + safety margin)
    const timeDisplay =
      estimatedTimeSeconds > 60
        ? `~${Math.ceil(estimatedTimeSeconds / 60)} minutes`
        : `~${Math.ceil(estimatedTimeSeconds)} seconds`;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving to Notion",
      message: `${selectedNoteIdsArray.length} notes in batches of ${batchSize} (${timeDisplay})`,
    });

    const selectedNotes = notes.filter((note) => selectedNoteIds.has(note.id));

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
      const batch = selectedNotes.slice(i, i + BATCH_SIZE);

      // Process batch in parallel with detailed error handling
      const batchPromises = batch.map(async (note) => {
        try {
          const { saveToNotion } = await import("./utils/granolaApi");
          const result = await saveToNotion(note.id);

          // Update state with success
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
          return { success: true, noteId: note.id };
        } catch (error) {
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

          // Update state with detailed error
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

          return { success: false, noteId: note.id };
        }
      });

      // Wait for the batch to complete then update progress
      await Promise.all(batchPromises);
      processedCount += batch.length;

      // Update progress with dynamic ETA after the batch completes
      const progressPercent = Math.round((processedCount / selectedNotes.length) * 100);
      const remainingNotes = selectedNotes.length - processedCount;
      const remainingBatches = Math.ceil(remainingNotes / BATCH_SIZE);
      const etaSeconds = remainingBatches * 2.5; // 2.5s per batch estimate
      const etaDisplay = etaSeconds > 60 ? `${Math.ceil(etaSeconds / 60)}m` : `${Math.ceil(etaSeconds)}s`;

      // Update toast with accurate count
      toast.message = `${processedCount}/${selectedNotes.length} (${progressPercent}%) - ETA: ${etaDisplay}`;

      // Conservative delay between batches
      if (i + BATCH_SIZE < selectedNotes.length) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    // Final results summary
    setTimeout(() => {
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
                      exec(`open "${firstSuccess.pageUrl}"`);
                    }
                  },
                }
              : undefined,
        });

        return currentResults;
      });
    }, 100);
  };

  const retrieveSelectedTranscripts = async () => {
    if (selectedNoteIds.size === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No notes selected",
        message: "Please select at least one note to retrieve transcripts.",
      });
      return;
    }

    if (selectedNoteIds.size > 500) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Batch too large",
        message: "Please select 500 or fewer notes. Consider processing in smaller batches for optimal performance.",
      });
      return;
    }

    const selectedNotes = notes.filter((note) => selectedNoteIds.has(note.id));

    // Initialize results with pending status
    const initialResults: BulkTranscriptResult[] = selectedNotes.map((note) => ({
      noteId: note.id,
      id: note.id,
      title: note.title || untitledNoteTitle,
      transcriptPreview: "",
      status: "pending",
    }));

    setBulkResults(initialResults);
    setShowResults(true);

    await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving transcripts",
      message: `Processing ${selectedNoteIds.size} notes...`,
    });

    const BATCH_SIZE = getDynamicBatchSize(selectedNotes.length);
    let processedCount = 0;

    // Performance estimation
    const estimatedTimeSeconds = Math.ceil((selectedNotes.length / BATCH_SIZE) * (BATCH_SIZE * 0.5 + 0.1)); // ~0.5s per transcript + batch overhead
    const timeDisplay =
      estimatedTimeSeconds > 60
        ? `~${Math.ceil(estimatedTimeSeconds / 60)} minutes`
        : `~${estimatedTimeSeconds} seconds`;

    // Show initial batch info with time estimate
    await showToast({
      style: Toast.Style.Animated,
      title: "Starting bulk processing",
      message: `${selectedNotes.length} transcripts in batches of ${BATCH_SIZE} (${timeDisplay})`,
    });

    // Process in batches for optimal speed/memory balance
    for (let i = 0; i < selectedNotes.length; i += BATCH_SIZE) {
      const batch = selectedNotes.slice(i, i + BATCH_SIZE);

      // Update progress with percentage and ETA
      const progressPercent = Math.round((processedCount / selectedNotes.length) * 100);
      const remainingNotes = selectedNotes.length - processedCount;
      const remainingBatches = Math.ceil(remainingNotes / BATCH_SIZE);
      const etaSeconds = remainingBatches * (BATCH_SIZE * 0.5 + 0.1);
      const etaDisplay = etaSeconds > 60 ? `${Math.ceil(etaSeconds / 60)}m` : `${Math.ceil(etaSeconds)}s`;

      await showToast({
        style: Toast.Style.Animated,
        title: "Processing transcripts",
        message: `${processedCount}/${selectedNotes.length} (${progressPercent}%) - ETA: ${etaDisplay}`,
      });

      // Process batch in parallel
      await Promise.all(
        batch.map(async (note) => {
          try {
            const transcript = await getTranscript(note.id);

            // Create minimal preview
            const previewTranscript = transcript.length > 100 ? transcript.substring(0, 100) + "..." : transcript;

            // Store only metadata - transcript gets garbage collected
            setBulkResults((prev) =>
              prev.map((result) =>
                result.noteId === note.id
                  ? {
                      ...result,
                      transcriptPreview: String(previewTranscript || ""),
                      transcriptLength: transcript.length,
                      status: "success" as const,
                    }
                  : result,
              ),
            );
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setBulkResults((prev) =>
              prev.map((result) =>
                result.noteId === note.id ? { ...result, status: "error" as const, error: errorMessage } : result,
              ),
            );
          }
        }),
      );

      processedCount += batch.length;

      // Dynamic pause based on batch size (larger batches = longer pause for cleanup)
      if (i + BATCH_SIZE < selectedNotes.length) {
        const pauseTime = Math.max(50, Math.min(200, BATCH_SIZE * 10)); // 50-200ms based on batch size
        await new Promise((resolve) => setTimeout(resolve, pauseTime));
      }
    }

    // Wait a moment for state to update, then calculate final counts
    setTimeout(() => {
      setBulkResults((currentResults) => {
        const successCount = currentResults.filter((r) => r.status === "success").length;
        const errorCount = currentResults.length - successCount;

        showToast({
          style: errorCount > 0 ? Toast.Style.Failure : Toast.Style.Success,
          title: "Transcript retrieval complete",
          message: `${successCount} successful, ${errorCount} failed`,
        });

        return currentResults;
      });
    }, 100);
  };

  if (showResults) {
    return (
      <BulkTranscriptResults results={bulkResults} onBackToSelection={() => setShowResults(false)} notes={notes} />
    );
  }

  if (showNotionResults) {
    return <BulkNotionResults results={notionResults} onBackToSelection={() => setShowNotionResults(false)} />;
  }

  return (
    <List
      navigationTitle={`Export Transcripts (${selectedNoteIds.size} selected)`}
      searchBarPlaceholder="Search notes to select for export..."
      actions={
        selectedNoteIds.size > 0 ? (
          <ActionPanel>
            <Action
              title={`Retrieve ${selectedNoteIds.size} Transcripts`}
              icon={Icon.Download}
              onAction={retrieveSelectedTranscripts}
            />
            <Action
              title={`Save ${selectedNoteIds.size} to Notion`}
              icon={Icon.Document}
              onAction={saveSelectedToNotion}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title="Clear Selection"
              icon={Icon.XMarkCircle}
              onAction={clearSelection}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <Action
              title="Select All"
              icon={Icon.CheckCircle}
              onAction={selectAllNotes}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          </ActionPanel>
        ) : (
          <ActionPanel>
            <Action
              title="Select All"
              icon={Icon.CheckCircle}
              onAction={selectAllNotes}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          </ActionPanel>
        )
      }
    >
      {notes.map((note) => (
        <List.Item
          key={note.id}
          title={note.title ?? untitledNoteTitle}
          icon={{
            source: selectedNoteIds.has(note.id) ? Icon.CheckCircle : Icon.Circle,
            tintColor: selectedNoteIds.has(note.id) ? Color.Green : Color.SecondaryText,
          }}
          accessories={[{ date: new Date(note.created_at) }, { text: note.creation_source || "Unknown source" }]}
          actions={
            <ActionPanel>
              <Action
                title={selectedNoteIds.has(note.id) ? "Deselect Note" : "Select Note"}
                icon={selectedNoteIds.has(note.id) ? Icon.XMarkCircle : Icon.CheckCircle}
                onAction={() => toggleNoteSelection(note.id)}
              />
              {selectedNoteIds.size > 0 && (
                <>
                  <Action
                    title={`Retrieve ${selectedNoteIds.size} Transcripts`}
                    icon={Icon.Download}
                    onAction={retrieveSelectedTranscripts}
                  />
                  <Action
                    title={`Save ${selectedNoteIds.size} to Notion`}
                    icon={Icon.Document}
                    onAction={saveSelectedToNotion}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </>
              )}
              <Action
                title="Clear Selection"
                icon={Icon.XMarkCircle}
                onAction={clearSelection}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action
                title="Select All"
                icon={Icon.CheckCircle}
                onAction={selectAllNotes}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function BulkTranscriptResults({
  results,
  onBackToSelection,
  notes,
}: {
  results: BulkTranscriptResult[];
  onBackToSelection: () => void;
  notes: Doc[];
}) {
  const [selectedResult, setSelectedResult] = useState<BulkTranscriptResult | null>(null);

  if (selectedResult) {
    return <IndividualTranscriptView result={selectedResult} onBackToResults={() => setSelectedResult(null)} />;
  }

  const successResults = results.filter((r) => r.status === "success");
  const errorResults = results.filter((r) => r.status === "error");
  const pendingResults = results.filter((r) => r.status === "pending");

  const generateCombinedTranscript = async () => {
    const BATCH_SIZE = getDynamicBatchSize(successResults.length);

    // Performance estimation
    const estimatedTimeSeconds = Math.ceil((successResults.length / BATCH_SIZE) * (BATCH_SIZE * 0.5 + 0.1));
    const timeDisplay =
      estimatedTimeSeconds > 60
        ? `~${Math.ceil(estimatedTimeSeconds / 60)} minutes`
        : `~${estimatedTimeSeconds} seconds`;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching all transcripts",
      message: `${successResults.length} transcripts in batches of ${BATCH_SIZE} (${timeDisplay})`,
    });

    try {
      // Get folder information for organizing transcripts with accurate data
      const documentToFolders = await getDocumentToFolderMapping().catch(() => {
        return {} as Record<string, string>;
      });

      // Group results by folder
      const folderGroups: Record<string, BulkTranscriptResult[]> = {};
      const unorganizedResults: BulkTranscriptResult[] = [];

      for (const result of successResults) {
        const folderName = documentToFolders[result.noteId];
        if (folderName) {
          if (!folderGroups[folderName]) {
            folderGroups[folderName] = [];
          }
          folderGroups[folderName].push(result);
        } else {
          unorganizedResults.push(result);
        }
      }

      const transcriptParts: string[] = [];
      let processedCount = 0;

      // Helper function to format individual transcript
      const formatTranscript = async (result: BulkTranscriptResult) => {
        const transcript = await getTranscript(result.noteId);

        // Find the note data for metadata
        const note = notes.find((n: Doc) => n.id === result.noteId);
        const createdDate = note ? new Date(note.created_at).toLocaleDateString() : "Unknown";
        const source = note?.creation_source || "Unknown";

        return `# ${result.title}

## Transcript

${transcript}

---

*Exported from Granola on ${new Date().toLocaleString()}*  
**Created:** ${createdDate} | **Source:** ${source}

---

`;
      };

      // Process folder groups first
      for (const [folderName, folderResults] of Object.entries(folderGroups)) {
        if (folderResults.length > 0) {
          transcriptParts.push(`\n# 📁 ${folderName}\n\n`);

          // Process folder's transcripts in batches
          for (let i = 0; i < folderResults.length; i += BATCH_SIZE) {
            const batch = folderResults.slice(i, i + BATCH_SIZE);

            // Update progress with ETA
            const remainingItems = successResults.length - processedCount;
            const eta = calculateETA(remainingItems, BATCH_SIZE);
            toast.message = formatProgressMessage(processedCount, successResults.length, eta);

            // Fetch batch in parallel
            const batchTranscripts = await Promise.all(batch.map(formatTranscript));

            // Add to combined result
            transcriptParts.push(...batchTranscripts);
            processedCount += batch.length;

            // Dynamic pause for cleanup
            if (i + BATCH_SIZE < folderResults.length) {
              const pauseTime = Math.max(50, Math.min(200, BATCH_SIZE * 10));
              await new Promise((resolve) => setTimeout(resolve, pauseTime));
            }
          }
        }
      }

      // Process unorganized transcripts
      if (unorganizedResults.length > 0) {
        transcriptParts.push(`\n# 📄 Other Notes\n\n`);

        for (let i = 0; i < unorganizedResults.length; i += BATCH_SIZE) {
          const batch = unorganizedResults.slice(i, i + BATCH_SIZE);

          // Update progress
          toast.message = formatProgressMessage(processedCount, successResults.length);

          // Fetch batch in parallel
          const batchTranscripts = await Promise.all(batch.map(formatTranscript));

          // Add to combined result
          transcriptParts.push(...batchTranscripts);
          processedCount += batch.length;

          // Dynamic pause for cleanup
          if (i + BATCH_SIZE < unorganizedResults.length) {
            const pauseTime = Math.max(50, Math.min(200, BATCH_SIZE * 10));
            await new Promise((resolve) => setTimeout(resolve, pauseTime));
          }
        }
      }

      const combined = transcriptParts.join("\n");
      await Clipboard.copy(combined);

      toast.style = Toast.Style.Success;
      toast.title = "All transcripts copied!";
      toast.message = `${successResults.length} transcripts combined (${Math.round(combined.length / 1000)}k chars)`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to copy transcripts";
      toast.message = String(error);
    }
  };

  const exportTranscriptsToZip = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Exporting transcripts to zip",
      message: `Processing ${successResults.length} transcripts...`,
    });

    try {
      // Use shared ExportService for batch processing
      const { tempDir } = await ExportService.processBatchExport(
        successResults,
        async (result) => {
          // Get full transcript
          const transcript = await getTranscript(result.id);

          // Find the note data for metadata
          const note = notes.find((n: Doc) => n.id === result.id);
          const createdDate = note ? new Date(note.created_at).toLocaleDateString() : "Unknown";
          const source = note?.creation_source || "Unknown";

          // Format transcript content
          const transcriptContent = `# ${result.title || "Untitled"}

## Transcript

${transcript}

---

*Exported from Granola on ${new Date().toLocaleString()}*  
**Created:** ${createdDate} | **Source:** ${source}
`;

          const safeTitle = sanitizeFileName(result.title || "Untitled");
          const fileName = `${safeTitle}_${result.id.substring(0, 8)}.md`;

          return {
            content: transcriptContent,
            fileName,
          };
        },
        {
          maxItems: 500,
          filePrefix: "granola_transcripts",
          includeOrganization: true,
        },
        (processed, total, eta) => {
          toast.message = `${processed}/${total} (${Math.round((processed / total) * 100)}%) - ETA: ${eta}`;
        },
      );

      // Create and download zip
      const zipFileName = createExportFilename("granola_transcripts");
      await ExportService.createAndDownloadZip(tempDir, zipFileName);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Export failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return (
    <List
      navigationTitle={`Transcript Results (${successResults.length}/${results.length} successful)`}
      searchBarPlaceholder="Search transcript results..."
      actions={
        <ActionPanel>
          {successResults.length > 0 && (
            <>
              <Action
                title="Export All to Zip"
                icon={Icon.ArrowDown}
                onAction={exportTranscriptsToZip}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                title="Copy All Successful Transcripts"
                icon={Icon.CopyClipboard}
                onAction={generateCombinedTranscript}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </>
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
              accessories={[{ text: "Processing..." }]}
            />
          ))}
        </List.Section>
      )}

      {successResults.length > 0 && (
        <List.Section title={`Successful (${successResults.length})`}>
          {successResults.map((result) => (
            <List.Item
              key={result.noteId}
              title={result.title}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              accessories={[{ text: `${result.transcriptLength || 0} characters` }]}
              actions={
                <ActionPanel>
                  <Action title="View Transcript" icon={Icon.Eye} onAction={() => setSelectedResult(result)} />
                  <Action
                    title="Copy This Transcript"
                    icon={Icon.CopyClipboard}
                    onAction={async () => {
                      // Show immediate feedback
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: "Copying...",
                      });
                      try {
                        // Fetch and copy in parallel with toast update
                        const [transcript] = await Promise.all([
                          getTranscript(result.noteId),
                          new Promise((resolve) => setTimeout(resolve, 100)), // Min toast display time
                        ]);

                        await Clipboard.copy(transcript);
                        toast.style = Toast.Style.Success;
                        toast.title = "Copied!";
                        toast.message = `${Math.round(transcript.length / 1000)}k characters`;
                      } catch (error) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Copy failed";
                        toast.message = String(error);
                      }
                    }}
                  />
                  <ActionPanel.Section>
                    {successResults.length > 0 && (
                      <>
                        <Action
                          title="Export All to Zip"
                          icon={Icon.ArrowDown}
                          onAction={exportTranscriptsToZip}
                          shortcut={{ modifiers: ["cmd"], key: "e" }}
                        />
                        <Action
                          title="Copy All Successful Transcripts"
                          icon={Icon.CopyClipboard}
                          onAction={generateCombinedTranscript}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                      </>
                    )}
                  </ActionPanel.Section>
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
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              accessories={[{ text: "Failed" }]}
              actions={
                <ActionPanel>
                  <Action title="View Error" icon={Icon.ExclamationMark} onAction={() => setSelectedResult(result)} />
                </ActionPanel>
              }
            />
          ))}
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
                  exec(`open "${firstSuccess.pageUrl}"`);
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
                        exec(`open "${result.pageUrl}"`);
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

function IndividualTranscriptView({
  result,
  onBackToResults,
}: {
  result: BulkTranscriptResult;
  onBackToResults: () => void;
}) {
  const [transcript, setTranscript] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const fetchTranscript = async () => {
      if (result.status !== "success") {
        if (isMounted) {
          setTranscript("");
          setError(result.error || "Failed to retrieve transcript");
          setIsLoading(false);
        }
        return;
      }

      try {
        const fullTranscript = await getTranscript(result.noteId);
        if (isMounted) {
          setTranscript(fullTranscript);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError(String(err));
          setTranscript("");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTranscript();

    return () => {
      isMounted = false;
    };
  }, [result.noteId, result.status]);

  const markdownContent = isLoading
    ? `# ${result.title}\n\nLoading transcript...`
    : error
      ? `# ${result.title}\n\nError: ${error}`
      : `# ${result.title}

## Transcript

${transcript}

---

*Exported from Granola on ${new Date().toLocaleString()}*`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdownContent}
      navigationTitle={`Transcript: ${result.title}`}
      actions={
        <ActionPanel>
          {transcript && (
            <Action.CopyToClipboard
              title="Copy Transcript"
              content={transcript}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          <Action
            title="Back to Results"
            icon={Icon.ArrowLeft}
            onAction={onBackToResults}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
        </ActionPanel>
      }
    />
  );
}
