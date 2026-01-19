import { getTranscript } from "../utils/fetchData";
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
    };
  }

  try {
    const document = await findDocumentById(input.noteId);

    const transcript = await getTranscript(input.noteId);

    // Defensive check for created_at date
    let formattedDate: string;
    try {
      if (document.created_at && !isNaN(new Date(document.created_at).getTime())) {
        formattedDate = new Date(document.created_at).toISOString();
      } else {
        // Fallback to current date if created_at is invalid or missing
        formattedDate = new Date().toISOString();
      }
    } catch (dateError) {
      // Fallback to current date if date parsing fails
      formattedDate = new Date().toISOString();
    }

    return {
      transcript,
      title: document.title || "Untitled Note",
      date: formattedDate,
    };
  } catch (error) {
    showFailureToast(toError(error), { title: "Failed to fetch transcript" });
    // Return a fallback response instead of throwing to avoid duplicate error handling
    return {
      transcript: "",
      title: "Error loading note",
      date: new Date().toISOString(),
    };
  }
}
