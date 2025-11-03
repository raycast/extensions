import { useState, useEffect } from "react";
import { storeBibleVersion, fetchBibleVersion } from "./storage";

export const DEFAULT_BIBLE_VERSION = "NLT";

export function useBibleVersion(initialVersion?: string) {
  const [version, setVersion] = useState<string | undefined>(initialVersion);

  // Store version when it changes
  useEffect(() => {
    if (version) {
      storeBibleVersion(version).catch(() => {
        console.error("Failed to save bible version to storage");
      });
    }
  }, [version]);

  // Load stored version if no initial version provided
  useEffect(() => {
    if (!initialVersion) {
      fetchBibleVersion()
        .then((storedVersion) => {
          setVersion(storedVersion ?? DEFAULT_BIBLE_VERSION);
        })
        .catch(() => {
          console.error("Failed to fetch stored bible version");
        });
    }
  }, [initialVersion]);

  return [version, setVersion] as const;
}
