import { fetchGranolaData } from "./fetchData";
import { NoteData, PanelsByDocId } from "./types";
import getCache from "./getCache";

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
    const noteData = fetchGranolaData("get-documents") as NoteData;
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
