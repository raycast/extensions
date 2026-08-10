import { useCallback } from "react";

import { getMusicSections, getPlexSetupStatus, resolveSelectedLibrary } from "./plex";
import { useAsyncValue } from "./use-async-value";
import type { LibrarySection } from "./types";

export function useLibrarySelection() {
  const loadState = useAsyncValue(
    useCallback(async () => {
      const [libraries, setupStatus] = await Promise.all([getMusicSections(), getPlexSetupStatus()]);
      const selectedLibrary = await resolveSelectedLibrary(libraries);

      return {
        libraries,
        selectedLibrary,
        selectedServerName: setupStatus.selectedServerName,
      };
    }, []),
    "library-selection",
    {
      libraries: [] as LibrarySection[],
      selectedLibrary: undefined,
      selectedServerName: undefined,
    },
  );

  return {
    isLoading: loadState.isLoading,
    libraries: loadState.value.libraries,
    selectedLibrary: loadState.value.selectedLibrary,
    selectedServerName: loadState.value.selectedServerName,
    error: loadState.error,
    reload: loadState.reload,
  };
}
