import { fetchGranolaData } from "./fetchData";
import { NoteData, PanelsByDocId } from "./types";
import getCache from "./getCache";

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

function extractPanelsFromCache(cache: unknown): PanelsByDocId | null {
  if (typeof cache !== "object" || cache === null) return null;
  const maybeState = (cache as { state?: unknown }).state;
  if (typeof maybeState !== "object" || maybeState === null) return null;
  const maybePanels = (maybeState as { documentPanels?: unknown }).documentPanels;
  if (typeof maybePanels !== "object" || maybePanels === null) return null;
  return maybePanels as PanelsByDocId;
}

export interface GranolaDataState {
  noteData: NoteData | null;
  panels: PanelsByDocId | null;
  isLoading: boolean;
  hasError: boolean;
  error?: Error;
}

/**
 * Shared hook for loading Granola notes and panel data
 * Consolidates the common pattern used across multiple command files
 */
export function useGranolaData(): GranolaDataState {
  try {
    const fetchResult: unknown = fetchGranolaData("get-documents");

    // Validate the fetched data shape at runtime
    if (!isNoteData(fetchResult)) {
      return {
        noteData: null,
        panels: null,
        isLoading: false,
        hasError: true,
        error: new Error("Invalid data shape returned from Granola API. Expected NoteData structure."),
      };
    }

    const noteData: NoteData = fetchResult;
    // Load panels from local cache (kept fresh via small TTL in getCache)
    let panels: PanelsByDocId | null = null;
    try {
      const cacheData = getCache();
      // The Granola app stores panels under state.documentPanels in the local cache
      panels = extractPanelsFromCache(cacheData);
    } catch {
      panels = null;
    }

    // Check loading state
    if (!noteData?.data && noteData.isLoading === true) {
      return {
        noteData,
        panels,
        isLoading: true,
        hasError: false,
      };
    }

    // Check for no data state
    if (!noteData?.data && noteData.isLoading === false) {
      return {
        noteData,
        panels,
        isLoading: false,
        hasError: true,
        error: new Error("No data available"),
      };
    }

    // Success state (panels may be null; UI should handle fallback to markdown)
    return {
      noteData,
      panels,
      isLoading: false,
      hasError: false,
    };
  } catch (error) {
    return {
      noteData: null,
      panels: null,
      isLoading: false,
      hasError: true,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
