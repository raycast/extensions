import { Document } from "../utils/types";
import { getFoldersWithCache } from "../utils/folderHelpers";
import { getDocumentsList } from "../utils/fetchData";

type Input = {
  /**
   * Optional filter for meeting title
   */
  title?: string;
  /**
   * Optional date filter for meetings
   * Supports:
   * - ISO 8601 format (e.g., "2025-03-07")
   * - Relative dates: "today", "yesterday"
   * - Time ranges: "last week", "last month"
   * - "latest" or "most recent" to get the most recent meeting
   */
  date?: string;
  /**
   * Optional folder ID to list meetings from a specific folder
   */
  folderId?: string;
  /**
   * Maximum number of meetings to return
   * Default: 10 for general queries, 1 for "latest" queries
   */
  limit?: number;
};

type Meeting = {
  /**
   * The ID of the meeting
   */
  id: string;
  /**
   * The title of the meeting
   */
  title: string;
  /**
   * The date when the meeting was created (ISO 8601 format)
   */
  date: string;
  /**
   * Folder IDs that this meeting belongs to
   */
  folderIds: string[];
  /**
   * Folder names that this meeting belongs to
   */
  folderNames: string[];
};

/**
 * Returns a list of meetings with basic metadata (title, date, ID) without content.
 * This is useful for quickly browsing meetings or finding specific meetings without
 * loading full content, which can exceed message size limits.
 *
 * Use this tool when:
 * - User asks for a list of meetings
 * - User asks about their latest/most recent meeting(s)
 * - User wants to see meetings from a specific time period
 * - You need to get meeting IDs before fetching full content
 *
 * CRITICAL: For task extraction queries like "what are the tasks from my latest meeting?":
 * 1. Call THIS tool with { "date": "latest", "limit": 1 } to get the meeting ID
 * 2. Then call ai-notes with { "noteId": "<id-from-step-1>", "includeTranscript": false }
 * DO NOT skip step 2 - you MUST call ai-notes with the specific noteId to get content.
 *
 * After getting the meeting list, use the ai-notes tool with specific noteId
 * to retrieve full content for individual meetings.
 */
export default async function tool(input: Input): Promise<Meeting[]> {
  const documents = (await getDocumentsList()) as Document[];

  if (!documents || documents.length === 0) {
    return [];
  }

  // Get folder information
  const documentToFolders: Record<string, { ids: string[]; names: string[] }> = {};
  let folderDocumentIds: string[] = [];

  try {
    const folders = await getFoldersWithCache({ includeDocumentIds: true });

    // Build document to folder mapping
    folders.forEach((folder) => {
      folder.document_ids.forEach((docId) => {
        if (!documentToFolders[docId]) {
          documentToFolders[docId] = { ids: [], names: [] };
        }
        documentToFolders[docId].ids.push(folder.id);
        documentToFolders[docId].names.push(folder.title);
      });
    });

    // Get documents for specific folder if requested
    if (input.folderId) {
      const folder = folders.find((f) => f.id === input.folderId);
      if (folder) {
        folderDocumentIds = folder.document_ids;
      }
    }
  } catch (error) {
    // Continue without folder information if fetching fails
  }

  // Convert documents to meetings
  const meetings: Meeting[] = [];

  for (const document of documents) {
    if (!document?.title || !document?.created_at || !document?.id) continue;

    // Skip if filtering by folder and document isn't in the folder
    if (input.folderId && folderDocumentIds.length > 0 && !folderDocumentIds.includes(document.id)) {
      continue;
    }

    const folderInfo = documentToFolders[document.id] || { ids: [], names: [] };

    meetings.push({
      id: document.id,
      title: document.title,
      date: new Date(document.created_at).toISOString(),
      folderIds: folderInfo.ids,
      folderNames: folderInfo.names,
    });
  }

  // Sort meetings by date (newest first)
  meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Apply filters
  let filteredMeetings = meetings;

  // Title filter
  if (input.title) {
    filteredMeetings = filteredMeetings.filter((meeting) =>
      meeting.title.toLowerCase().includes(input.title!.toLowerCase()),
    );
  }

  // Date filter (excluding "latest" logic which is handled after all filters)
  let isLatestQuery = false;
  if (input.date && input.date.trim() !== "") {
    const inputLower = input.date.toLowerCase();

    // Check if this is a "latest" query but don't process it yet
    if (inputLower.includes("latest") || inputLower.includes("most recent") || inputLower.includes("recent")) {
      isLatestQuery = true;
    } else {
      // Apply other date filters
      filteredMeetings = filteredMeetings.filter((meeting) => {
        try {
          const meetingDate = new Date(meeting.date);
          const meetingDateStr = meetingDate.toISOString().split("T")[0];

          if (inputLower === "today") {
            const today = new Date();
            return meetingDateStr === today.toISOString().split("T")[0];
          } else if (inputLower === "yesterday") {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return meetingDateStr === yesterday.toISOString().split("T")[0];
          } else if (inputLower === "last week" || inputLower.includes("week")) {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return meetingDate >= weekAgo;
          } else if (inputLower === "last month" || inputLower.includes("month")) {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return meetingDate >= monthAgo;
          } else {
            // Try parsing as ISO date
            const targetDate = new Date(input.date!);
            return meetingDateStr === targetDate.toISOString().split("T")[0];
          }
        } catch (e) {
          return false;
        }
      });
    }
  }

  // Ensure meetings are sorted by date (newest first) after all filtering
  filteredMeetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Apply limit based on query type
  let limit = input.limit;
  if (!limit) {
    // For "latest" queries, default to 1; otherwise default to 10
    limit = isLatestQuery ? 1 : 10;
  }

  return filteredMeetings.slice(0, limit);
}
