import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { EntryLike, PinMethods, PinnedMovement } from "./types";
import { isSameEntry } from "./utils";

const PINNED_ENTRIES_KEY = "windsurf-pinned-entries";

export function usePinnedEntries(): EntryLike[] & PinMethods {
  const [pinnedEntries, setPinnedEntries] = useState<EntryLike[]>([]);

  useEffect(() => {
    loadPinnedEntries();
  }, []);

  const loadPinnedEntries = async () => {
    const stored = await LocalStorage.getItem<string>(PINNED_ENTRIES_KEY);
    if (stored) {
      try {
        setPinnedEntries(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse pinned entries:", error);
      }
    }
  };

  const savePinnedEntries = async (entries: EntryLike[]) => {
    setPinnedEntries(entries);
    await LocalStorage.setItem(PINNED_ENTRIES_KEY, JSON.stringify(entries));
  };

  const pin = (entry: EntryLike) => {
    if (!pinnedEntries.some((e) => isSameEntry(e, entry))) {
      savePinnedEntries([...pinnedEntries, entry]);
    }
  };

  const unpin = (entry: EntryLike) => {
    savePinnedEntries(pinnedEntries.filter((e) => !isSameEntry(e, entry)));
  };

  const unpinAll = () => {
    savePinnedEntries([]);
  };

  const moveUp = (entry: EntryLike) => {
    const index = pinnedEntries.findIndex((e) => isSameEntry(e, entry));
    if (index > 0) {
      const newEntries = [...pinnedEntries];
      [newEntries[index], newEntries[index - 1]] = [
        newEntries[index - 1],
        newEntries[index],
      ];
      savePinnedEntries(newEntries);
    }
  };

  const moveDown = (entry: EntryLike) => {
    const index = pinnedEntries.findIndex((e) => isSameEntry(e, entry));
    if (index < pinnedEntries.length - 1) {
      const newEntries = [...pinnedEntries];
      [newEntries[index], newEntries[index + 1]] = [
        newEntries[index + 1],
        newEntries[index],
      ];
      savePinnedEntries(newEntries);
    }
  };

  const getAllowedMovements = (entry: EntryLike): PinnedMovement[] => {
    const index = pinnedEntries.findIndex((e) => isSameEntry(e, entry));
    if (index === -1) return [];

    const movements: PinnedMovement[] = [];
    if (index > 0) movements.push("up");
    if (index < pinnedEntries.length - 1) movements.push("down");

    return movements;
  };

  return Object.assign(pinnedEntries, {
    pin,
    moveUp,
    moveDown,
    unpin,
    unpinAll,
    getAllowedMovements,
  });
}
