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

    if (!entries.some((e) => e.domain === entry.domain && e.size === entry.size)) {
      setValue([...entries, entry]);
    }
  }

  // helper function to remove a `FormEntry` to `LocalStorage`
  function removeHistoryEntry(entry: FormEntry) {
    if (entries == undefined || entries.length == 0) {
      return;
    }

    setValue(entries.filter((e) => e.domain !== entry.domain));
  }

  return {
    entries,
    addHistoryEntry,
    removeHistoryEntry,
    isLoading,
  };
}
