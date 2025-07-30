import { fetchGranolaData } from "./fetchData";
import getCache from "./getCache";
import { NoteData, PanelsByDocId } from "./types";

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
    const cacheData = getCache();
    const panels = cacheData?.state?.documentPanels;

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

    // Check for no cached data
    if (!panels) {
      return {
        noteData,
        panels,
        isLoading: false,
        hasError: true,
        error: new Error("No cached panel data available"),
      };
    }

    // Success state
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
