import { withAccessToken } from "@raycast/utils";
import { tiro } from "../lib/auth";
import { listRecentNotes, searchNotes } from "../lib/api";
import { peopleNames } from "../lib/format";

type Input = {
  /**
   * Keyword to match against note titles and transcripts. Use the language the meeting was held in.
   * Leave empty to list the most recent notes.
   */
  keyword?: string;
  /**
   * Maximum number of notes to return, between 1 and 30. Defaults to 10.
   */
  limit?: number;
};

/**
 * Finds Tiro notes. Call this first to get note IDs, then call get-note for content.
 */
async function tool(input: Input) {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 30);
  const keyword = input.keyword?.trim();
  const notes = keyword ? await searchNotes(keyword, limit) : (await listRecentNotes(limit)).slice(0, limit);

  return notes.map((note) => ({
    id: note.guid,
    title: note.title,
    createdAt: note.createdAt,
    durationMinutes: Math.round(note.recordingDurationSeconds / 60),
    participants: peopleNames(note),
    url: note.webUrl,
    matchedSnippets: note.matchedSnippets ?? undefined,
  }));
}

export default withAccessToken(tiro)(tool);
