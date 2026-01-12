import { saveToNotionWithRetry } from "../utils/granolaApi";
import { findDocumentsByIds } from "../utils/toolHelpers";
import { getNotionBatchSize } from "../utils/notionBatching";
import { showFailureToast } from "@raycast/utils";
import { toError, toErrorMessage } from "../utils/errorUtils";

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

    // User-configurable batch size to control parallelism
    const batchSize = getNotionBatchSize(documentMap.length);

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
          const result = await saveToNotionWithRetry(noteId, { maxRetries: 2 });
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
            error: toErrorMessage(error),
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return { results };
  } catch (error) {
    const normalizedError = toError(error);
    showFailureToast(normalizedError, { title: "Failed to save to Notion" });
    throw normalizedError;
  }
}
