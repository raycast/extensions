import getCache from "../utils/getCache";
import convertHtmlToMarkdown from "../utils/convertHtmltoMarkdown";

type Input = {
  /**
   * Optional filter for note title
   */
  title?: string;
  /**
   * Optional date filter in ISO 8601 format for notes to look for  
   * Use this in relation to the user's time, for example: "All notes from today", "All notes from yesterday", "All notes from the last week"
   * If a user says "In my last note" or something similar, use the most recent note by date, including notes from today
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

  for (const docId in content) {
    for (const panelId in content[docId]) {
      const panel = content[docId][panelId];
      const note: Note = {
        title: panel.title,
        date: panel.created_at,
        content: convertHtmlToMarkdown(panel.original_content)
      };

      // Apply filters if provided
      if (input.title && !note.title.toLowerCase().includes(input.title.toLowerCase())) {
        continue;
      }
      
      if (input.date && note.date.split('T')[0] !== input.date.split('T')[0]) {
        continue;
      }
      
      if (input.contentFilter && !note.content.toLowerCase().includes(input.contentFilter.toLowerCase())) {
        continue;
      }

      notes.push(note);
    }
  }

  return notes;
}
