import { useEffect, useState } from "react";
import { Alert, confirmAlert, LocalStorage } from "@raycast/api";
import { Language, LocalStorageEntry } from "@src/types";
import {
  getLocalStorageEntryId,
  isSameDay,
  isToday,
  parseStorageValues,
  showErrorToast,
  showSuccessToast,
} from "@src/util";

export const usePersistence = (languages: Language[]) => {
  const [entries, setEntries] = useState<LocalStorageEntry[]>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const getEntriesFromStorage = async () => {
      try {
        const items = await LocalStorage.allItems();
        if (isCancelled) return;
        const parsedEntries = parseStorageValues(items);
        const filteredEntries = parsedEntries.filter((entry) => languages.includes(entry.language));
        const sortedEntries = filteredEntries.sort((a, b) => b.date.getTime() - a.date.getTime());
        setEntries(sortedEntries);
        setIsLoading(false);
      } catch {
        if (isCancelled) return;
        showErrorToast({ title: "Failed to read entries from local storage" });
        setIsLoading(false);
      }
    };

    getEntriesFromStorage();

    return () => {
      isCancelled = true;
    };
  }, [JSON.stringify(languages)]);

  const activeEntry = entries?.find((entry) => isToday(entry.date));

  const setEntry = async (entry: LocalStorageEntry) => {
    const { date, language } = entry;
    try {
      await LocalStorage.setItem(
        `${language}-${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`,
        JSON.stringify(entry)
      );
      setEntries((prev) => {
        if (prev) {
          return [...prev.filter((e) => !(isSameDay(e.date, entry.date) && e.language === entry.language)), entry];
        }
        return [entry];
      });
    } catch {
      showErrorToast({ title: "Failed to write entry to local storage" });
    }
  };

  const deleteEntry = async ({ language, date }: { language: Language; date: Date }) => {
    try {
      if (
        await confirmAlert({
          title: "Are you sure?",
          message: "All your saved data from this specific puzzle will be irreversibly removed.",
          primaryAction: {
            title: "Delete Summary",
            style: Alert.ActionStyle.Destructive,
          },
        })
      ) {
        await LocalStorage.removeItem(getLocalStorageEntryId({ language, date }));
        setEntries((prev) => prev?.filter((entry) => !(entry.date === date && entry.language === language)));
        showSuccessToast({ title: "Entry removed" });
      }
    } catch {
      showErrorToast({ title: "Failed to remove entry from local storage" });
    }
  };

  const deleteAllEntries = async () => {
    try {
      if (
        await confirmAlert({
          title: "Are you sure?",
          message: "All your saved data from previous puzzles will be irreversibly removed.",
          primaryAction: {
            title: "Delete All",
            style: Alert.ActionStyle.Destructive,
          },
        })
      ) {
        await LocalStorage.clear();
        setEntries([]);
        showSuccessToast({ title: "Entries removed" });
      }
    } catch {
      showErrorToast({ title: "Failed to remove all entries from local storage" });
    }
  };

  return { entries, activeEntry, setEntry, deleteAllEntries, deleteEntry, isLoading };
};
