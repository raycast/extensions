import { saveToNotion } from "../utils/granolaApi";
import { findDocumentsByIds } from "../utils/toolHelpers";
import { getDynamicBatchSize } from "../utils/exportHelpers";
import { showFailureToast } from "@raycast/utils";

type Input = {
  /**
   * Array of note IDs to save to Notion
   */
  noteIds: string[];
};

type Output = {
  /**
   * Results of the save operation for each note
   */
  results: Array<{
    noteId: string;
    title: string;
    status: "success" | "error";
    pageUrl?: string;
    error?: string;
  }>;
};

/**
 * Saves one or more notes to Notion.
 * Returns the Notion page URLs for successfully saved notes.
 * Use this when the user wants to export or share their notes to Notion.
 */
export default async function tool(input: Input): Promise<Output> {
  try {
    // Validate input
    if (!input.noteIds || input.noteIds.length === 0) {
      throw new Error("No note IDs provided");
    }

    // Get all documents at once using shared helper
    const documentMap = await findDocumentsByIds(input.noteIds);

    const results = [];

    // Conservative batch processing to prevent API rate limiting
    const batchSize = getDynamicBatchSize(documentMap.length);

    for (let i = 0; i < documentMap.length; i += batchSize) {
      const batch = documentMap.slice(i, i + batchSize);

      const batchPromises = batch.map(async ({ document, noteId }) => {
        const title = document?.title || "Untitled Note";

        // Skip if document not found
        if (!document) {
          return {
            noteId,
            title: "Unknown Note",
            status: "error" as const,
            error: "Note not found in cache",
          };
        }

        try {
          const result = await saveToNotion(noteId);
          return {
            noteId,
            title,
            status: "success" as const,
            pageUrl: result.page_url,
          };
        } catch (error) {
          return {
            noteId,
            title,
            status: "error" as const,
            error: String(error),
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Conservative delay between batches to prevent API overwhelm
      if (i + batchSize < documentMap.length) {
        await new Promise((resolve) => setTimeout(resolve, 800)); // 800ms between batches for API stability
      }
    }

    return { results };
  } catch (error) {
    showFailureToast({ title: "Failed to save to Notion", message: String(error) });
    throw error;
  }
}
