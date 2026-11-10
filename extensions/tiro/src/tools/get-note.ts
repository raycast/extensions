import { withAccessToken } from "@raycast/utils";
import { tiro } from "../lib/auth";
import { getNote, getSummaryMarkdown, getTranscript } from "../lib/api";
import { peopleNames } from "../lib/format";

const TRANSCRIPT_CHAR_LIMIT = 60_000;

type Input = {
  /**
   * The note ID returned by search-notes.
   */
  noteId: string;
  /**
   * Set to true only when the summary isn't enough, such as for exact quotes or who said what.
   */
  includeTranscript?: boolean;
};

/**
 * Gets a Tiro note's AI summary, and optionally its speaker-attributed transcript.
 */
async function tool(input: Input) {
  const [note, summary] = await Promise.all([getNote(input.noteId), getSummaryMarkdown(input.noteId)]);

  let transcript: string | undefined;
  let transcriptTruncated = false;
  if (input.includeTranscript || !summary) {
    const full = await getTranscript(input.noteId);
    transcriptTruncated = full.length > TRANSCRIPT_CHAR_LIMIT;
    transcript = transcriptTruncated ? full.slice(0, TRANSCRIPT_CHAR_LIMIT) : full;
  }

  return {
    id: note.guid,
    title: note.title,
    createdAt: note.createdAt,
    durationMinutes: Math.round(note.recordingDurationSeconds / 60),
    participants: peopleNames(note),
    url: note.webUrl,
    summary: summary ?? undefined,
    transcript,
    transcriptTruncated: transcriptTruncated || undefined,
  };
}

export default withAccessToken(tiro)(tool);
