import { useEffect } from "react";
import { useLocalStorage } from "@raycast/utils";

export const DEFAULT_BIBLE_VERSION = "NLT";

const BIBLE_VERSION_KEY = "bibleVersion";

export function useBibleVersion(initialVersion?: string) {
  const { value, setValue, isLoading } = useLocalStorage(BIBLE_VERSION_KEY, initialVersion);

  // If an initialVersion is provided (e.g., from command arguments),
  // save it to local storage
  useEffect(() => {
    if (initialVersion) {
      setValue(initialVersion);
    }
  }, [initialVersion]);

  // If we are done loading and there's still no value, set it to
  // the default
  useEffect(() => {
    if (!isLoading && !value) {
      setValue(DEFAULT_BIBLE_VERSION);
    }
  }, [isLoading, value]);

  return [value, setValue] as const;
}
