import getCache from "../utils/getCache";
import { convertDocumentToMarkdown } from "../utils/convertJsonNodes";
import { showFailureToast } from "@raycast/utils";
import { Document, DocumentStructure } from "../utils/types";
import { getTranscript, getFolders } from "../utils/fetchData";

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
 * Returns a list of notes from Granola that match the provided filters,
 * or folder information when listFolders is true.
 *
 * This tool supports two primary functions:
 * 1. Note retrieval and filtering with optional transcript inclusion
 * 2. Folder listing and organization features
 *
 * For note queries, it can filter by title, content, date, or folder.
 * For folder queries, it returns folder metadata including note counts.
 */
export default async function tool(input: Input): Promise<Note[] | FolderInfo[]> {
  // Handle folder listing request
  if (input.listFolders) {
    try {
      const response = await getFolders();
      const folders = Object.values(response.lists);

      return folders.map((folder) => ({
        id: folder.id,
        name: folder.title,
        description: folder.description || undefined,
        noteCount: folder.document_ids.length,
        createdAt: folder.created_at,
        noteIds: folder.document_ids,
      }));
    } catch (error) {
      console.error("Error fetching folders:", error);
      showFailureToast({ title: "Failed to fetch folders", message: String(error) });
      return [];
    }
  }

  const cache = getCache();
  const documents = Object.values(cache?.state?.documents) as Document[];
  const notes: Note[] = [];

  if (!documents) {
    return [];
  }

  // If folderId is provided, get the folder's document IDs
  let folderDocumentIds: string[] = [];
  if (input.folderId) {
    try {
      const response = await getFolders();
      const folder = Object.values(response.lists).find((f) => f.id === input.folderId);
      if (folder) {
        folderDocumentIds = folder.document_ids;
      }
    } catch (error) {
      console.error("Error fetching folder:", error);
      showFailureToast({ title: "Failed to fetch folder", message: String(error) });
    }
  }

  // Get folder information for each document
  const documentToFolders: Record<string, string[]> = {};
  try {
    const response = await getFolders();
    Object.values(response.lists).forEach((folder) => {
      folder.document_ids.forEach((docId) => {
        if (!documentToFolders[docId]) {
          documentToFolders[docId] = [];
        }
        documentToFolders[docId].push(folder.id);
      });
    });
  } catch (error) {
    console.error("Error mapping documents to folders:", error);
  }

  // Collect all notes first
  for (const document of documents) {
    if (!document?.title || !document?.created_at || !document?.notes?.content || !document?.id) continue;

    // Skip if we're filtering by folder and this document isn't in the folder
    if (input.folderId && folderDocumentIds.length > 0 && !folderDocumentIds.includes(document.id)) {
      continue;
    }

    const note: Note = {
      title: document.title,
      date: new Date(document.created_at).toISOString(),
      content: convertDocumentToMarkdown(document.notes as unknown as DocumentStructure),
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
      try {
        const noteDate = new Date(note.date);
        const noteDateStr = noteDate.toISOString().split("T")[0];

        let targetDate: Date | null = null;
        const inputLower = input.date.toLowerCase();

        if (inputLower === "today") {
          targetDate = new Date();
          return noteDateStr === targetDate.toISOString().split("T")[0];
        } else if (inputLower === "yesterday") {
          targetDate = new Date();
          targetDate.setDate(targetDate.getDate() - 1);
          return noteDateStr === targetDate.toISOString().split("T")[0];
        } else if (inputLower === "last week") {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return noteDate >= weekAgo;
        } else if (inputLower === "last month") {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return noteDate >= monthAgo;
        } else {
          // Try parsing as ISO date
          targetDate = new Date(input.date);
          return noteDateStr === targetDate.toISOString().split("T")[0];
        }
      } catch (e) {
        showFailureToast(`Invalid date format or query: note.date=${note.date} or input.date=${input.date}`);
        return false;
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
          console.error(`Failed to fetch transcript for note ${note.id}:`, error);
        }
      }),
    );

    return notesWithTranscripts;
  }

  return filteredNotes;
}
