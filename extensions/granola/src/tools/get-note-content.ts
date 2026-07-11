import { convertDocumentToMarkdown } from "../utils/convertJsonNodes";
import { showFailureToast } from "@raycast/utils";
import { DocumentStructure, PanelsByDocId } from "../utils/types";
import { getPanelId } from "../utils/getPanelId";
import { getFoldersWithCache } from "../utils/folderHelpers";
import { findDocumentById } from "../utils/toolHelpers";
import { getDocumentPanels } from "../utils/granolaApi";
import { toError } from "../utils/errorUtils";
import { getMeetingDuration } from "../utils/fetchData";

type Input = {
  /**
   * The ID of the note to get content for
   */
  noteId: string;
  /**
   * Optional content type to return
   * - "enhanced": AI-enhanced notes from panels
   * - "original": User's original notes/content
   * - "auto": Automatically choose best available content (default)
   */
  contentType?: "enhanced" | "original" | "auto";
};

type Output = {
  /**
   * The title of the note
   */
  title: string;
  /**
   * The date when the note was created
   */
  date: string;
  /**
   * Content of the note in Markdown
   */
  content: string;
  /**
   * Folder IDs that this note belongs to
   */
  folderIds: string[];
  /**
   * Folder names that this note belongs to
   */
  folderNames: string[];
  /**
   * Meeting duration (e.g., "45 minutes", "1 hour 23 minutes"), or null if unavailable
   */
  duration: string | null;
};

/**
 * Helper function to resolve enhanced content from panels
 * @param panels - The document panels data
 * @param documentId - The document ID to get content for
 * @returns The resolved content string, or empty string if not found
 */
function resolveEnhancedContent(panels: PanelsByDocId | undefined, documentId: string): string {
  if (!panels || !documentId || !panels[documentId]) {
    return "";
  }

  const panelId = getPanelId(panels, documentId);
  if (!panelId || !panels[documentId][panelId]) {
    return "";
  }

  const panelData = panels[documentId][panelId];

  if (panelData.content) {
    return convertDocumentToMarkdown(panelData.content);
  } else if (panelData.original_content) {
    return panelData.original_content;
  }

  return "";
}

function sanitizeNoteContent(value?: string | null): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "undefined") {
    return "";
  }

  return value;
}

function resolveOriginalContent(document: {
  notes_markdown?: string | null;
  notes_plain?: string | null;
  notes?: DocumentStructure | null;
}): string {
  const notesMarkdown = sanitizeNoteContent(document.notes_markdown);
  if (notesMarkdown) {
    return notesMarkdown;
  }

  const structuredNotes = sanitizeNoteContent(convertDocumentToMarkdown(document.notes));
  if (structuredNotes) {
    return structuredNotes;
  }

  return sanitizeNoteContent(document.notes_plain);
}

/**
 * Retrieves the full content for a specific note by ID.
 */
export default async function tool(input: Input): Promise<Output> {
  return getNoteContent(input);
}

async function getNoteContent(input: Input): Promise<Output> {
  if (!input.noteId) {
    return {
      title: "Error: No note ID provided. Use list-meetings first to get a meeting ID.",
      date: new Date().toISOString(),
      content: "",
      folderIds: [],
      folderNames: [],
      duration: null,
    };
  }

  try {
    const document = await findDocumentById(input.noteId);
    const panels = await getDocumentPanels(input.noteId);
    const panelsForResolve = panels ?? undefined;

    let content = "";
    const requestedContentType = input.contentType || "auto";

    if (requestedContentType === "original") {
      content = resolveOriginalContent(document);
    } else if (requestedContentType === "enhanced") {
      content = sanitizeNoteContent(resolveEnhancedContent(panelsForResolve, input.noteId));
    } else {
      content = sanitizeNoteContent(resolveEnhancedContent(panelsForResolve, input.noteId));
      if (!content) {
        content = resolveOriginalContent(document);
      }
    }

    let folderIds: string[] = [];
    let folderNames: string[] = [];
    try {
      const folders = await getFoldersWithCache({ includeDocumentIds: true });
      const matchingFolders = folders.filter((folder) => folder.document_ids.includes(input.noteId));
      folderIds = matchingFolders.map((folder) => folder.id);
      folderNames = matchingFolders.map((folder) => folder.title);
    } catch {
      // Continue without folder info
    }

    let formattedDate: string;
    try {
      if (document.created_at && !isNaN(new Date(document.created_at).getTime())) {
        formattedDate = new Date(document.created_at).toISOString();
      } else {
        formattedDate = new Date().toISOString();
      }
    } catch {
      formattedDate = new Date().toISOString();
    }

    let duration: string | null = null;
    try {
      duration = await getMeetingDuration(input.noteId);
    } catch {
      // Continue without duration info
    }

    return {
      title: document.title || "New note",
      date: formattedDate,
      content,
      folderIds,
      folderNames,
      duration,
    };
  } catch (error) {
    showFailureToast(toError(error), { title: "Failed to fetch note" });
    return {
      title: "Error loading note",
      date: new Date().toISOString(),
      content: "",
      folderIds: [],
      folderNames: [],
      duration: null,
    };
  }
}
