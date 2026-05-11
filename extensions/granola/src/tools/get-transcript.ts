import { getTranscriptSegments, formatDurationVerbose, calculateDurationFromSegments } from "../utils/fetchData";
import { findDocumentById } from "../utils/toolHelpers";
import { showFailureToast } from "@raycast/utils";
import { toError } from "../utils/errorUtils";

type Input = {
  /**
   * The ID of the note to get the transcript for
   */
  noteId: string;
};

type Output = {
  /**
   * The full transcript content
   */
  transcript: string;
  /**
   * The title of the note
   */
  title: string;
  /**
   * The date when the note was created
   */
  date: string;
  /**
   * Meeting duration (e.g., "45 minutes", "1 hour 23 minutes"), or null if unavailable
   */
  duration: string | null;
};

/**
 * Retrieves the full transcript for a specific note by ID.
 * Use this when the user specifically asks for transcript content, conversation details, or what was said in a meeting.
 */
export default async function tool(input: Input): Promise<Output> {
  if (!input.noteId) {
    return {
      transcript: "",
      title: "Error: No note ID provided. Use list-meetings first to get a meeting ID.",
      date: new Date().toISOString(),
      duration: null,
    };
  }

  try {
    const document = await findDocumentById(input.noteId);
    const segments = await getTranscriptSegments(input.noteId);

    let transcript = "";
    if (segments.length === 0) {
      transcript = "Transcript not available for this note.";
    } else {
      segments.forEach((segment) => {
        if (segment.source === "microphone") {
          transcript += `**Me:** ${segment.text}\n\n`;
        } else if (segment.source === "system") {
          transcript += `**System:** ${segment.text}\n\n`;
        } else {
          transcript += `${segment.text}\n\n`;
        }
      });
      transcript = transcript.trim();
    }

    const durationMs = calculateDurationFromSegments(segments);
    const duration = durationMs ? formatDurationVerbose(durationMs) : null;

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

    return {
      transcript,
      title: document.title || "New note",
      date: formattedDate,
      duration,
    };
  } catch (error) {
    showFailureToast(toError(error), { title: "Failed to fetch transcript" });
    return {
      transcript: "",
      title: "Error loading note",
      date: new Date().toISOString(),
      duration: null,
    };
  }
}
