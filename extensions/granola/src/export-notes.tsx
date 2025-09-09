import { ActionPanel, Action, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState } from "react";
import { useGranolaData } from "./utils/useGranolaData";
import { convertDocumentToMarkdown } from "./utils/convertJsonNodes";
import { getPanelId } from "./utils/getPanelId";
import { sanitizeFileName, createExportFilename, openDownloadsFolder } from "./utils/exportHelpers";
import { ExportService, type ExportResult } from "./utils/exportService";

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

  const exportSelectedNotes = async () => {
    const selectedNotes = notes.filter((note) => selectedNoteIds.has(note.id));

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Exporting notes",
      message: `Processing ${selectedNoteIds.size} notes...`,
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

      // Create and download zip
      const zipFileName = createExportFilename("granola_export");
      await ExportService.createAndDownloadZip(tempDir, zipFileName);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Export failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  if (showResults) {
    return <BulkExportResults results={bulkResults} onBackToSelection={() => setShowResults(false)} />;
  }

  return (
    <List
      navigationTitle={`Export Notes (${selectedNoteIds.size} selected)`}
      searchBarPlaceholder="Search notes to select for export..."
      actions={
        selectedNoteIds.size > 0 ? (
          <ActionPanel>
            <Action
              title={`Export ${selectedNoteIds.size} Notes to Zip`}
              icon={Icon.ArrowDown}
              onAction={exportSelectedNotes}
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
                <Action
                  title={`Export ${selectedNoteIds.size} Notes to Zip`}
                  icon={Icon.ArrowDown}
                  onAction={exportSelectedNotes}
                />
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

function BulkExportResults({ results, onBackToSelection }: { results: ExportResult[]; onBackToSelection: () => void }) {
  const { successResults, errorResults } = ExportService.getExportStats(results);
  const pendingResults = results.filter((r) => r.status === "pending");

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
        <List.Section title={`Successfully Exported (${successResults.length})`}>
          {successResults.map((result) => (
            <List.Item
              key={result.noteId}
              title={result.title}
              subtitle={result.fileName}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              accessories={[{ text: result.fileSize ? `${Math.round(result.fileSize / 1000)}k chars` : "Exported" }]}
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
                        message: result.error || "Unknown error",
                      });
                    }}
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
