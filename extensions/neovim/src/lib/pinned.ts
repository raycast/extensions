import { LocalStorage } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { SessionEntry } from "./types";

const PINNED_KEY = "neovim-pinned-sessions";

export type PinnedMethods = {
  pinnedEntries: SessionEntry[];
  isLoading: boolean;
  pin: (entry: SessionEntry) => void;
  unpin: (entry: SessionEntry) => void;
  moveUp: (entry: SessionEntry) => void;
  moveDown: (entry: SessionEntry) => void;
  unpinAll: () => void;
  getAllowedMovements: (entry: SessionEntry) => ("up" | "down")[];
};

export function usePinnedEntries(): PinnedMethods {
  const [pinnedEntries, setPinnedEntries] = useState<SessionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LocalStorage.getItem<string>(PINNED_KEY).then((data) => {
      if (data) {
        try {
          setPinnedEntries(JSON.parse(data));
        } catch {
          setPinnedEntries([]);
        }
      }
      setIsLoading(false);
    });
  }, []);

  const savePinned = useCallback(async (entries: SessionEntry[]) => {
    setPinnedEntries(entries);
    await LocalStorage.setItem(PINNED_KEY, JSON.stringify(entries));
  }, []);

  const pin = useCallback(
    async (entry: SessionEntry) => {
      if (pinnedEntries.some((p) => p.path === entry.path)) return;
      await savePinned([...pinnedEntries, entry]);
    },
    [pinnedEntries, savePinned],
  );

  const unpin = useCallback(
    async (entry: SessionEntry) => {
      await savePinned(pinnedEntries.filter((p) => p.path !== entry.path));
    },
    [pinnedEntries, savePinned],
  );

  const moveUp = useCallback(
    async (entry: SessionEntry) => {
      const idx = pinnedEntries.findIndex((p) => p.path === entry.path);
      if (idx <= 0) return;
      const next = [...pinnedEntries];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      await savePinned(next);
    },
    [pinnedEntries, savePinned],
  );

  const moveDown = useCallback(
    async (entry: SessionEntry) => {
      const idx = pinnedEntries.findIndex((p) => p.path === entry.path);
      if (idx < 0 || idx >= pinnedEntries.length - 1) return;
      const next = [...pinnedEntries];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      await savePinned(next);
    },
    [pinnedEntries, savePinned],
  );

  const unpinAll = useCallback(async () => {
    await savePinned([]);
  }, [savePinned]);

  const getAllowedMovements = useCallback(
    (entry: SessionEntry): ("up" | "down")[] => {
      const idx = pinnedEntries.findIndex((p) => p.path === entry.path);
      const movements: ("up" | "down")[] = [];
      if (idx > 0) movements.push("up");
      if (idx < pinnedEntries.length - 1) movements.push("down");
      return movements;
    },
    [pinnedEntries],
  );

  return { pinnedEntries, isLoading, pin, unpin, moveUp, moveDown, unpinAll, getAllowedMovements };
}
