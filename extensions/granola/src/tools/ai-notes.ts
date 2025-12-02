import { convertDocumentToMarkdown } from "../utils/convertJsonNodes";
import { showFailureToast } from "@raycast/utils";
import { Document, DocumentStructure, PanelsByDocId } from "../utils/types";
import { getTranscript } from "../utils/fetchData";
import { getPanelId } from "../utils/getPanelId";
import { getFolderInfoForAI, getFoldersWithCache } from "../utils/folderHelpers";
import { getDocumentsList } from "../utils/fetchData";

type Input = {
  /**
   * Optional filter for note title
   */
  title?: string;
  /**
   * Optional date filter for notes to look for
   * Supports:
   * - ISO 8601 format (e.g., "2025-03-07")
   * - Relative dates: "today", "yesterday"
   * - Time ranges: "last week", "last month"
   * If the message contains "most recent", or anything similar, the date should be empty. Use all time using the user's local machine time.
   */
  date?: string;
  /**
   * Optional content filter
   */
  contentFilter?: string;
  /**
   * Whether to include the full transcript for each note
   * Set to true when user asks for specific quotes, meeting details, or conversation transcripts
   */
  includeTranscript?: boolean;
  /**
   * Optional specific note ID to fetch transcript for
   * Use when a user refers to a specific note they want to examine in detail
   * CRITICAL: For task extraction queries like "what are the tasks from my latest meeting?",
   * you MUST use this parameter with the ID obtained from list-meetings tool.
   * Pattern: First call list-meetings with date:"latest" limit:1, then use the returned ID here.
   */
  noteId?: string;
  /**
   * Whether to list folders instead of notes
   * Set to true when user asks about folders or wants to see folder organization
   */
  listFolders?: boolean;
  /**
   * Optional folder ID to fetch notes from a specific folder
   * Use when a user asks about notes in a specific folder
   */
  folderId?: string;
  /**
   * Optional content type to return
   * - "enhanced": AI-enhanced notes from panels (default)
   * - "original": User's original notes/content
   * - "auto": Automatically choose best available content
   * Use "original" when user specifically asks for "my notes", "what I wrote", "original content"
   * Use "enhanced" when user asks for "AI notes", "enhanced", "processed notes"
   */
  contentType?: "enhanced" | "original" | "auto";
  /**
   * Whether to exclude content from the response
   * Set to true when you only need metadata (title, date, ID) without the actual note content
   * This is useful to prevent message size limits when dealing with multiple notes
   * Default: false
   */
  excludeContent?: boolean;
};

type Note = {
  /**
   * The title of the note
   */
  title: string;
  /**
   * The date of when the note was created
   * Use this in conjunction with the user's local time, for example: "All notes from today", "All notes from yesterday", "All notes from the last week"
   */
  date: string;
  /**
   * Content of the note in HTML. It will be converted into Markdown at a later step.
   */
  content: string;
  /**
   * Optional full transcript of the note/meeting
   * Only included when explicitly requested or for detailed inquiries
   */
  transcript?: string;
  /**
   * The ID of the note, useful for follow-up queries
   */
  id: string;
  /**
   * Optional folder IDs that this note belongs to
   */
  folderIds?: string[];
};

type FolderInfo = {
  /**
   * The ID of the folder
   */
  id: string;
  /**
   * The title/name of the folder
   */
  name: string;
  /**
   * Optional description of the folder
   */
  description?: string;
  /**
   * The number of notes in the folder
   */
  noteCount: number;
  /**
   * The date when the folder was created
   */
  createdAt: string;
  /**
   * List of note IDs in this folder
   */
  noteIds: string[];
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

/**
 * Returns a list of notes from Granola that match the provided filters,
 * or folder information when listFolders is true.
 *
 * This tool supports three primary functions:
 * 1. Note retrieval and filtering with optional transcript inclusion
 * 2. Folder listing and organization features
 * 3. Metadata-only queries (with excludeContent=true) to avoid message size limits
 *
 * For note queries, it can filter by title, content, date, or folder.
 * For folder queries, it returns folder metadata including note counts.
 *
 * CRITICAL PATTERN for task extraction queries (e.g., "what are the tasks from my latest meeting?"):
 * 1. First call list-meetings with { "date": "latest", "limit": 1 } to get the meeting ID
 * 2. Then call THIS tool with { "noteId": "<id-from-step-1>", "includeTranscript": false }
 * DO NOT use contentFilter or excludeContent for task extraction - use noteId instead.
 *
 * IMPORTANT: When dealing with queries that might return many notes (e.g., "all meetings",
 * "tasks from meetings"), consider using:
 * - The list-meetings tool for just metadata
 * - This tool with excludeContent=true for filtered results without content
 * - This tool with specific noteId to get full content for individual notes
 */
export default async function tool(input: Input): Promise<Note[] | FolderInfo[]> {
  // Handle folder listing request using shared folder service
  if (input.listFolders) {
    try {
      return await getFolderInfoForAI();
    } catch (error) {
      showFailureToast({ title: "Failed to fetch folders", message: String(error) });
      return [];
    }
  }

  const documents = (await getDocumentsList()) as Document[];
  // Load panels for enhanced content access
  const cache = await import("../utils/getCache").then((mod) => mod.default());
  const panels = cache?.state?.documentPanels;
  const notes: Note[] = [];

  if (!documents) {
    return [];
  }

  // If folderId is provided, get the folder's document IDs using shared folder service
  let folderDocumentIds: string[] = [];
  if (input.folderId) {
    try {
      const folders = await getFoldersWithCache({ includeDocumentIds: true });
      const folder = folders.find((f) => f.id === input.folderId);
      if (folder) {
        folderDocumentIds = folder.document_ids;
      }
    } catch (error) {
      showFailureToast({ title: "Failed to fetch folder", message: String(error) });
    }
  }

  // Get folder information for each document using shared folder service
  const documentToFolders: Record<string, string[]> = {};
  try {
    const folders = await getFoldersWithCache({ includeDocumentIds: true });

    folders.forEach((folder) => {
      folder.document_ids.forEach((docId) => {
        if (!documentToFolders[docId]) {
          documentToFolders[docId] = [];
        }
        documentToFolders[docId].push(folder.id);
      });
    });
  } catch (error) {
    // Continue without folder information if fetching fails
  }

  // Collect all notes first
  for (const document of documents) {
    if (!document?.title || !document?.created_at || !document?.id) continue;

    // Skip if we're filtering by folder and this document isn't in the folder
    if (input.folderId && folderDocumentIds.length > 0 && !folderDocumentIds.includes(document.id)) {
      continue;
    }

    // Content resolution strategy based on user preference
    let content = "";

    // Skip content resolution if excludeContent is true
    if (!input.excludeContent) {
      const requestedContentType = input.contentType || "auto";

      if (requestedContentType === "original") {
        // User explicitly wants their original notes
        if (document.notes_markdown) {
          content = document.notes_markdown;
        }
      } else if (requestedContentType === "enhanced") {
        // User explicitly wants AI-enhanced notes
        content = resolveEnhancedContent(panels, document.id);

        // If no enhanced content, try document.notes (structured notes)
        if (!content && document.notes?.content) {
          content = convertDocumentToMarkdown(document.notes as unknown as DocumentStructure);
        }
      } else {
        // Auto mode: Try enhanced first, then fall back to original
        content = resolveEnhancedContent(panels, document.id);

        // If no panel content, try document.notes (structured notes)
        if (!content && document.notes?.content) {
          content = convertDocumentToMarkdown(document.notes as unknown as DocumentStructure);
        }

        // Final fallback to user's original markdown notes
        if (!content && document.notes_markdown) {
          content = document.notes_markdown;
        }
      }

      // Skip if we still have no content and content is required
      if (!content) continue;
    }

    const note: Note = {
      title: document.title,
      date: new Date(document.created_at).toISOString(),
      content: content,
      id: document.id,
      folderIds: documentToFolders[document.id] || [],
    };
    notes.push(note);
  }

  // If no notes found, return empty array
  if (notes.length === 0) {
    return [];
  }

  // Sort notes by date (newest first)
  notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Handle specific note ID request - return just that note with transcript
  if (input.noteId) {
    const specificNote = notes.find((note) => note.id === input.noteId);
    if (specificNote) {
      try {
        specificNote.transcript = await getTranscript(input.noteId);
        return [specificNote];
      } catch (error) {
        // If transcript fetch fails, still return the note without transcript
        return [specificNote];
      }
    }
  }

  // Filter notes based on criteria
  const filteredNotes = notes.filter((note) => {
    // Apply title filter if provided
    if (input.title && !note.title.toLowerCase().includes(input.title.toLowerCase())) {
      return false;
    }

    // Apply content filter if provided
    if (input.contentFilter && !note.content.toLowerCase().includes(input.contentFilter.toLowerCase())) {
      return false;
    }

    // Apply date filter if provided and not empty
    if (input.date && input.date.trim() !== "") {
      const inputLower = input.date.toLowerCase();
      const isLatestQuery =
        inputLower.includes("latest") ||
        inputLower.includes("most recent") ||
        inputLower === "recent" ||
        inputLower === "newest";

      if (isLatestQuery) {
        // Treat "latest" style date filters as chronological lookups without additional filtering
        return true;
      }

      try {
        const noteDate = new Date(note.date);
        const noteDateStr = noteDate.toISOString().split("T")[0];

        if (Number.isNaN(noteDate.getTime())) {
          return true;
        }

        if (inputLower === "today") {
          const today = new Date();
          return noteDateStr === today.toISOString().split("T")[0];
        }

        if (inputLower === "yesterday") {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return noteDateStr === yesterday.toISOString().split("T")[0];
        }

        if (inputLower === "last week" || inputLower.includes("week")) {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return noteDate >= weekAgo;
        }

        if (inputLower === "last month" || inputLower.includes("month")) {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return noteDate >= monthAgo;
        }

        const targetDate = new Date(input.date);
        if (Number.isNaN(targetDate.getTime())) {
          return true;
        }

        return noteDateStr === targetDate.toISOString().split("T")[0];
      } catch (error) {
        return true;
      }
    }

    return true;
  });

  // If transcript inclusion is requested, fetch transcripts for filtered notes
  // This could be slow for multiple notes, so we limit to the most relevant ones
  if (input.includeTranscript) {
    const notesWithTranscripts = filteredNotes.slice(0, 3); // Limit to first 3 most recent matching notes

    // Fetch transcripts in parallel with Promise.all
    await Promise.all(
      notesWithTranscripts.map(async (note) => {
        try {
          note.transcript = await getTranscript(note.id);
        } catch (error) {
          // If transcript fetch fails, continue without it
        }
      }),
    );

    return notesWithTranscripts;
  }

  return filteredNotes;
}
