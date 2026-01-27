import { fetchGranolaData } from "./fetchData";
import { NoteData } from "./types";
import { toError } from "./errorUtils";

/**
 * Type guard to validate if the fetched data matches NoteData shape
 * Checks for required fields and their types to ensure runtime safety
 */
function isNoteData(data: unknown): data is NoteData {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;

  // Check required fields
  if (typeof obj.isLoading !== "boolean") return false;
  if (!("data" in obj)) return false;
  if (typeof obj.revalidate !== "function") return false;

  // If data exists, validate it's a GetDocumentsResponse shape
  if (obj.data !== undefined && obj.data !== null) {
    if (typeof obj.data !== "object") return false;
    const responseData = obj.data as Record<string, unknown>;

    // Check if docs is an array (when present)
    if ("docs" in responseData && responseData.docs !== undefined) {
      if (!Array.isArray(responseData.docs)) return false;
    }

    // Check if deleted is an array (when present)
    if ("deleted" in responseData && responseData.deleted !== undefined) {
      if (!Array.isArray(responseData.deleted)) return false;
    }
  }

  return true;
}

export interface GranolaDataState {
  noteData: NoteData | null;
  isLoading: boolean;
  hasError: boolean;
  error?: Error;
}

/**
 * Shared hook for loading Granola notes from API
 * Panels are loaded on-demand using useDocumentPanels hook when needed
 * Large fields (notes_markdown, people) are stripped immediately in fetchGranolaData
 * to reduce memory usage before data flows through the component tree
 */
export function useGranolaData(): GranolaDataState {
  try {
    const fetchResult: unknown = fetchGranolaData("get-documents");

    // Validate the fetched data shape at runtime
    if (!isNoteData(fetchResult)) {
      return {
        noteData: null,
        isLoading: false,
        hasError: true,
        error: new Error("Invalid data shape returned from Granola API. Expected NoteData structure."),
      };
    }

    // Data is already transformed (stripped) in fetchGranolaData, so we can use it directly
    // This avoids keeping references to the original data with large fields
    const noteData: NoteData = fetchResult;

    // Check loading state
    if (!noteData?.data && noteData.isLoading === true) {
      return {
        noteData,
        isLoading: true,
        hasError: false,
      };
    }

    // Check for no data state
    if (!noteData?.data && noteData.isLoading === false) {
      return {
        noteData,
        isLoading: false,
        hasError: true,
        error: new Error("No data available"),
      };
    }

    // Success state
    return {
      noteData,
      isLoading: false,
      hasError: false,
    };
  } catch (error) {
    return {
      noteData: null,
      isLoading: false,
      hasError: true,
      error: toError(error),
    };
  }
}
