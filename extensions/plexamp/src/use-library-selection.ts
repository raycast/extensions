import { useCallback, useEffect, useState } from "react";

import { getMusicSections, resolveSelectedLibrary } from "./plex";
import type { LibrarySection } from "./types";

interface LibrarySelectionState {
  isLoading: boolean;
  libraries: LibrarySection[];
  selectedLibrary?: LibrarySection;
  error?: string;
}

export function useLibrarySelection() {
  const [state, setState] = useState<LibrarySelectionState>({
    isLoading: true,
    libraries: [],
  });

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: undefined }));

    try {
      const libraries = await getMusicSections();
      const selectedLibrary = await resolveSelectedLibrary(libraries);
      setState({ isLoading: false, libraries, selectedLibrary });
    } catch (error) {
      setState({
        isLoading: false,
        libraries: [],
        selectedLibrary: undefined,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    ...state,
    reload,
  };
}
