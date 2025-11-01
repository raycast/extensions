import { ActionPanel, Action, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useMemo } from "react";
import { useGranolaData } from "./utils/useGranolaData";
import { convertDocumentToMarkdown } from "./utils/convertJsonNodes";
import { getPanelId } from "./utils/getPanelId";
import { sanitizeFileName, createExportFilename, openDownloadsFolder } from "./utils/exportHelpers";
import { ExportService, type ExportResult } from "./utils/exportService";
import { useFolders } from "./utils/useFolders";
import { mapIconToHeroicon, getDefaultIconUrl, mapColorToHex } from "./utils/iconMapper";

import { Doc, PanelsByDocId } from "./utils/types";
import Unresponsive from "./templates/unresponsive";
import { sortNotesByDate } from "./components/NoteComponents";

export default function Command() {
  const { noteData, panels, isLoading, hasError } = useGranolaData();

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
      <BulkExportList
        notes={sortNotesByDate(noteData?.data?.docs || [])}
        untitledNoteTitle={untitledNoteTitle}
        panels={panels || {}}
      />
    );
  }
}

function BulkExportList({
  notes,
  untitledNoteTitle,
  panels,
}: {
  notes: Doc[];
  untitledNoteTitle: string;
  panels: PanelsByDocId;
}) {
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [bulkResults, setBulkResults] = useState<ExportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const { folders, isLoading: foldersLoading } = useFolders();
  const [selectedFolder, setSelectedFolder] = useState<string>("all");

  const docToFolderNames = useMemo(() => {
    const mapping: Record<string, string[]> = {};
    folders.forEach((folder) => {
      folder.document_ids.forEach((docId) => {
        if (!mapping[docId]) {
          mapping[docId] = [];
        }
        mapping[docId].push(folder.title);
      });
    });
    return mapping;
  }, [folders]);

  const folderIdToDocIds = useMemo(() => {
    const record: Record<string, Set<string>> = {};
    folders.forEach((folder) => {
      record[folder.id] = new Set(folder.document_ids);
    });
    return record;
  }, [folders]);

  const noteIdsSet = useMemo(() => new Set(notes.map((note) => note.id)), [notes]);

  const folderNoteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    folders.forEach((folder) => {
      const relevantIds = folder.document_ids.filter((id) => noteIdsSet.has(id));
      counts[folder.id] = relevantIds.length;
    });
    return counts;
  }, [folders, noteIdsSet]);

  const notesNotInFolders = useMemo(() => {
    return notes.filter((note) => !docToFolderNames[note.id]?.length);
  }, [notes, docToFolderNames]);

  const filteredNotes = useMemo(() => {
    if (selectedFolder === "all") {
      return notes;
    }

    if (selectedFolder === "orphans") {
      return notesNotInFolders;
    }

    const docIds = folderIdToDocIds[selectedFolder];
    if (!docIds) {
      return [];
    }
    return notes.filter((note) => docIds.has(note.id));
  }, [notes, selectedFolder, folderIdToDocIds, notesNotInFolders]);

  const filteredNoteIds = useMemo(() => filteredNotes.map((note) => note.id), [filteredNotes]);

  const currentFolderLabel = useMemo(() => {
    if (selectedFolder === "all") {
      return null;
    }
    if (selectedFolder === "orphans") {
      return "Notes Not in Folders";
    }
    const match = folders.find((folder) => folder.id === selectedFolder);
    return match?.title || null;
  }, [selectedFolder, folders]);

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
    setSelectedNoteIds(new Set(filteredNoteIds));
  };

  const clearSelection = () => {
    setSelectedNoteIds(new Set());
  };

  const formatNoteAsMarkdown = (note: Doc, panels: PanelsByDocId): string => {
    const title = note.title || untitledNoteTitle;
    const createdDate = new Date(note.created_at).toLocaleDateString();

    // Get user's original notes
    const myNotes = note.notes_markdown || "No personal notes available.";

    // Get enhanced notes from panels
    let enhancedNotes = "No enhanced notes available.";

    if (panels && panels[note.id]) {
      const panelId = getPanelId(panels, note.id);
      if (panelId && panels[note.id][panelId]) {
        const panelData = panels[note.id][panelId];

        if (panelData.content) {
          // Convert structured content to markdown
          enhancedNotes = convertDocumentToMarkdown(panelData.content);
        } else if (panelData.original_content) {
          // Use HTML content and clean it up for markdown
          enhancedNotes = cleanHtmlToMarkdown(panelData.original_content);
        }
      }
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

  const cleanHtmlToMarkdown = (html: string): string => {
    // Basic HTML to Markdown conversion
    return html
      .replace(/<h([1-6])>/g, (_, level) => "#".repeat(parseInt(level)) + " ")
      .replace(/<\/h[1-6]>/g, "\n\n")
      .replace(/<p>/g, "")
      .replace(/<\/p>/g, "\n\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<ul>/g, "")
      .replace(/<\/ul>/g, "\n")
      .replace(/<ol>/g, "")
      .replace(/<\/ol>/g, "\n")
      .replace(/<li>/g, "- ")
      .replace(/<\/li>/g, "\n")
      .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
      .replace(/<em>(.*?)<\/em>/g, "*$1*")
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, "[$2]($1)")
      .replace(/<hr\s*\/?>/g, "\n---\n")
      .replace(/<[^>]*>/g, "") // Remove any remaining HTML tags
      .replace(/\n\s*\n\s*\n/g, "\n\n") // Clean up excessive line breaks
      .trim();
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

    if (noteIds.length > 500) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Batch too large",
        message: "Please select 500 or fewer notes. Try exporting in smaller batches.",
      });
      return;
    }

    const noteIdsSetForLookup = new Set(noteIds);
    const selectedNotes = notes.filter((note) => noteIdsSetForLookup.has(note.id));

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Exporting notes",
      message: `Processing ${noteIds.length} notes...`,
    });

    try {
      // Use shared ExportService for batch processing
      const { results, tempDir } = await ExportService.processBatchExport(
        selectedNotes,
        async (note) => {
          const markdownContent = formatNoteAsMarkdown(note, panels);
          const safeTitle = sanitizeFileName(note.title || untitledNoteTitle);
          const fileName = `${safeTitle}_${note.id.substring(0, 8)}.md`;

          return {
            content: markdownContent,
            fileName,
          };
        },
        {
          maxItems: 500,
          filePrefix: "granola_export",
          includeOrganization: true,
        },
        (processed, total, eta) => {
          toast.message = `${processed}/${total} (${Math.round((processed / total) * 100)}%) - ETA: ${eta}`;
        },
      );

      setBulkResults(results);
      setShowResults(true);
      setSelectedNoteIds(new Set(noteIds));

      // Create and download zip
      const zipFileName = createExportFilename("granola_export");
      await ExportService.createAndDownloadZip(tempDir, zipFileName);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Export failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  const exportFilteredNotes = async () => {
    if (filteredNoteIds.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No notes in current filter",
        message: "Try selecting a different folder before exporting.",
      });
      return;
    }

    const targetIds = filteredNoteIds;
    setSelectedNoteIds(new Set(targetIds));
    await exportSelectedNotes(targetIds);
  };

  if (showResults) {
    return (
      <BulkExportResults
        results={bulkResults}
        onBackToSelection={() => setShowResults(false)}
        notes={notes}
        docToFolderNames={docToFolderNames}
      />
    );
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
                .slice()
                .sort((a, b) => a.title.localeCompare(b.title))
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
      actions={
        <ActionPanel>
          {selectedNoteIds.size > 0 ? (
            <>
              <Action
                title={`Export ${selectedNoteIds.size} Notes to Zip`}
                icon={Icon.ArrowDown}
                onAction={() => exportSelectedNotes()}
              />
              <Action
                title={
                  selectedFolder === "all"
                    ? `Export ${filteredNoteIds.length} Notes to Zip`
                    : `Export ${filteredNoteIds.length} from ${filterLabel} to Zip`
                }
                icon={Icon.ArrowDown}
                onAction={exportFilteredNotes}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
              <Action
                title="Clear Selection"
                icon={Icon.XMarkCircle}
                onAction={clearSelection}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action
                title={
                  selectedFolder === "all"
                    ? `Select All Notes (${filteredNoteIds.length})`
                    : `Select All in ${filterLabel} (${filteredNoteIds.length})`
                }
                icon={Icon.CheckCircle}
                onAction={selectAllNotes}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
            </>
          ) : (
            <>
              <Action
                title={
                  selectedFolder === "all"
                    ? `Export ${filteredNoteIds.length} Notes to Zip`
                    : `Export ${filteredNoteIds.length} from ${filterLabel} to Zip`
                }
                icon={Icon.ArrowDown}
                onAction={exportFilteredNotes}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
              <Action
                title={
                  selectedFolder === "all"
                    ? `Select All Notes (${filteredNoteIds.length})`
                    : `Select All in ${filterLabel} (${filteredNoteIds.length})`
                }
                icon={Icon.CheckCircle}
                onAction={selectAllNotes}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      {filteredNotes.map((note) => {
        const folderNames = docToFolderNames[note.id] || [];
        const accessories = [];

        if (folderNames.length > 0) {
          accessories.push({
            text: folderNames.join(", "),
            icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
          });
        }

        accessories.push({ date: new Date(note.created_at) });
        accessories.push({ text: note.creation_source || "Unknown source" });

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
                <Action
                  title={selectedNoteIds.has(note.id) ? "Deselect Note" : "Select Note"}
                  icon={selectedNoteIds.has(note.id) ? Icon.XMarkCircle : Icon.CheckCircle}
                  onAction={() => toggleNoteSelection(note.id)}
                />
                {selectedNoteIds.size > 0 && (
                  <Action
                    title={`Export ${selectedNoteIds.size} Notes to Zip`}
                    icon={Icon.ArrowDown}
                    onAction={() => exportSelectedNotes()}
                  />
                )}
                <Action
                  title={
                    selectedFolder === "all"
                      ? `Export ${filteredNoteIds.length} Notes to Zip`
                      : `Export ${filteredNoteIds.length} from ${filterLabel} to Zip`
                  }
                  icon={Icon.ArrowDown}
                  onAction={exportFilteredNotes}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
                <Action
                  title="Clear Selection"
                  icon={Icon.XMarkCircle}
                  onAction={clearSelection}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <Action
                  title={
                    selectedFolder === "all"
                      ? `Select All Notes (${filteredNoteIds.length})`
                      : `Select All in ${filterLabel} (${filteredNoteIds.length})`
                  }
                  icon={Icon.CheckCircle}
                  onAction={selectAllNotes}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
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
  docToFolderNames,
}: {
  results: ExportResult[];
  onBackToSelection: () => void;
  notes: Doc[];
  docToFolderNames: Record<string, string[]>;
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
              docToFolderNames[result.noteId] || (result.folderName ? [result.folderName] : undefined) || [];

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
              docToFolderNames[result.noteId] || (result.folderName ? [result.folderName] : undefined) || [];
            const note = noteMap.get(result.noteId);

            const accessories = [];

            if (folderNames.length > 0) {
              accessories.push({
                text: folderNames.join(", "),
                icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
              });
            }

            if (note) {
              accessories.push({ date: new Date(note.created_at) });
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
              docToFolderNames[result.noteId] || (result.folderName ? [result.folderName] : undefined) || [];
            const note = noteMap.get(result.noteId);

            const accessories = [];

            if (folderNames.length > 0) {
              accessories.push({
                text: folderNames.join(", "),
                icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
              });
            }

            if (note) {
              accessories.push({ date: new Date(note.created_at) });
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
