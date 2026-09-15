import { useCallback, useEffect, useRef, useState } from "react";
import { homedir } from "node:os";
import type { SearchDirectory, SearchDirectorySource } from "../types/finder";
import type { SearchError } from "../types/search";
import type { ExtensionPreferences } from "../types/preferences";
import { resolveSearchDirectory, validateDirectory } from "../services/finder-service";

interface DirectoryState {
  directory: SearchDirectory | null;
  /** Why Finder detection failed, when a fallback or prompt is active. */
  finderError: SearchError | null;
  isLoading: boolean;
}

export function useSearchDirectory(preferences: ExtensionPreferences) {
  const [state, setState] = useState<DirectoryState>({ directory: null, finderError: null, isLoading: true });
  const generation = useRef(0);

  const redetect = useCallback(async () => {
    const current = ++generation.current;
    setState((previous) => ({ ...previous, isLoading: true }));
    const resolution = await resolveSearchDirectory(preferences);
    if (current !== generation.current) return; // stale detection
    setState({
      directory: "directory" in resolution ? resolution.directory : null,
      finderError: resolution.finderError,
      isLoading: false,
    });
  }, [preferences]);

  useEffect(() => {
    void redetect();
  }, [redetect]);

  const setDirectory = useCallback(async (path: string, source: SearchDirectorySource) => {
    generation.current++; // cancel any in-flight detection
    try {
      const validated = await validateDirectory(path);
      setState({ directory: { path: validated, source }, finderError: null, isLoading: false });
    } catch (error) {
      setState({ directory: null, finderError: error as SearchError, isLoading: false });
    }
  }, []);

  const useHomeDirectory = useCallback(() => setDirectory(homedir(), "home"), [setDirectory]);

  return { ...state, redetect, setDirectory, useHomeDirectory };
}
