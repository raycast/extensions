import { useEffect, useState } from "react";
import { usePersistentState } from "raycast-toolkit";
import { readWslHistory } from "../lib/wsl";
import { getPrefs } from "../lib/preferences";

interface UseWslHistoryReturn {
  recentlyUsed: string[];
  shellHistory: string[];
  isLoading: boolean;
  addToRecentlyUsed: (command: string) => void;
  removeFromRecentlyUsed: (command: string) => void;
}

export function useWslHistory(filterText: string): UseWslHistoryReturn {
  const [recentlyUsed, setRecentlyUsed] = usePersistentState<string[]>("wsl-recently-used", []);
  const [shellHistory, setShellHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const prefs = getPrefs();

    readWslHistory(prefs.defaultDistro || undefined, prefs.shellType)
      .then((history) => {
        if (!cancelled) {
          setShellHistory(history);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShellHistory([]);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const addToRecentlyUsed = (command: string) => {
    setRecentlyUsed((list) => {
      const filtered = list.filter((x) => x !== command);
      return [command, ...filtered].slice(0, 20);
    });
  };

  const removeFromRecentlyUsed = (command: string) => {
    setRecentlyUsed((list) => list.filter((x) => x !== command));
  };

  const lowerFilter = filterText.toLowerCase();

  const filteredRecent = filterText
    ? recentlyUsed.filter((item) => item.toLowerCase().includes(lowerFilter))
    : recentlyUsed;

  const filteredShellHistory = filterText
    ? shellHistory.filter((item) => item.toLowerCase().includes(lowerFilter)).slice(0, 50)
    : shellHistory.slice(0, 50);

  return {
    recentlyUsed: filteredRecent,
    shellHistory: filteredShellHistory,
    isLoading,
    addToRecentlyUsed,
    removeFromRecentlyUsed,
  };
}
