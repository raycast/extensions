import { useLocalStorage } from "@raycast/utils";
import { FormEntry } from "../types/types";

/** A custom hook to retrieve, store, and remove a `FormEntry` which is from the `addHistoryEntry` function after submission */
export function useFaviconeHistory() {
  const { value, setValue, isLoading } = useLocalStorage<FormEntry[]>("faviconeHistory");

  // for some reason, `value` must be checked if it's an array, or else `entries.map` may not be valid
  const entries = value && Array.isArray(value) ? value : [];

  // helper function to add a `FormEntry` to `LocalStorage`
  function addHistoryEntry(entry: FormEntry) {
    if (entries == undefined) {
      setValue([]);
      return;
    }

    if (!entries.some((e) => e.domain === entry.domain && e.width === entry.width && e.height === entry.height)) {
      setValue([...entries, entry]);
    }
  }

  // helper function to remove a `FormEntry` to `LocalStorage`
  function removeHistoryEntry(entry: FormEntry) {
    if (entries == undefined || entries.length == 0) {
      return;
    }

    setValue(
      entries.filter((e) => {
        // Remove if domain AND dimensions match
        const domainMatches = e.domain === entry.domain;
        const widthMatches = e.width === entry.width;
        const heightMatches = e.height === entry.height;

        // Keep the entry only if it doesn't match completely
        return !(domainMatches && widthMatches && heightMatches);
      }),
    );
  }

  function replaceHistoryEntry(oldEntry: FormEntry, newEntry: FormEntry) {
    if (entries == undefined || entries.length == 0) {
      return;
    }

    setValue(
      entries
        .filter((e) => {
          const domainMatches = e.domain === oldEntry.domain;
          const widthMatches = e.width === oldEntry.width;
          const heightMatches = e.height === oldEntry.height;
          return !(domainMatches && widthMatches && heightMatches);
        })
        .concat(newEntry),
    );
  }

  return {
    entries,
    addHistoryEntry,
    removeHistoryEntry,
    replaceHistoryEntry,
    isLoading,
  };
}
