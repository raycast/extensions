import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { NoteLibrary, readLibrary, resolveSyncFolder } from "./notes";
import { CleftPreferences } from "./preferences";

export function useLibrary() {
  const [library, setLibrary] = useState<NoteLibrary>();
  const [error, setError] = useState<Error>();
  const [isLoading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    const preferences = getPreferenceValues<CleftPreferences>();
    resolveSyncFolder(preferences.syncFolder)
      .then(readLibrary)
      .then((result) => {
        if (!cancelled) setLibrary(result);
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason
              : new Error("Could not read Cleft exports."),
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);
  return {
    library,
    error,
    isLoading,
    refresh: () => setRevision((value) => value + 1),
  };
}
