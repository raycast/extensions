import getCache from "../utils/getCache";
import convertHtmlToMarkdown from "../utils/convertHtmltoMarkdown";
import { showFailureToast } from "@raycast/utils";

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
   * If the message contains "most recent", or anything similar, the date should be empty
   */
  date?: string;
  /**
   * Optional content filter
   */
  contentFilter?: string;
};

type Note = {
  /**
   * The title of the note
   */
  title: string;
  /**
   * The date of when the note was created
   * Use this in conjunction with the user's time, for example: "All notes from today", "All notes from yesterday", "All notes from the last week"
   */
  date: string;
  /**
   * Content of the note in HTML. It will be converted into Markdown at a later step.
   */
  content: string;
};

/**
 * Returns a list of notes from Granola that match the provided filters
 */
export default function tool(input: Input) {
  const cache = getCache();
  const content = cache?.state?.documentPanels;
  const notes: Note[] = [];

  if (!content) {
    return [];
  }

  // Collect all notes first
  for (const docId in content) {
    for (const panelId in content[docId]) {
      const panel = content[docId][panelId];
      if (!panel?.title || !panel?.created_at || !panel?.original_content) continue;
      const note: Note = {
        title: panel.title,
        date: panel.created_at,
        content: `Original Notes:\n\n${panel.notes_markdown}\n\nAI Notes:\n\n${convertHtmlToMarkdown(panel.original_content)}`,
      };
      notes.push(note);
    }
  }

  // If no notes found, return empty array
  if (notes.length === 0) {
    return [];
  }

  // Sort notes by date (newest first)
  notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // If no date specified or explicitly asking for latest, return most recent note
  // const inputLower = input.date?.toLowerCase() || '';
  // if (!input.date || inputLower === 'most recent' || inputLower === 'latest' || inputLower === 'last') {
  //   return [notes[0]];
  // }

  // Filter notes based on criteria
  return notes.filter((note) => {
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
}
