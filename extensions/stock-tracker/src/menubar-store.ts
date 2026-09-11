import { LaunchType, LocalStorage, launchCommand, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "menubar-symbols";

export interface MenuBarStore {
  add: (symbol: string) => void;
  remove: (symbol: string) => void;
}

export async function loadMenuBarSymbols(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
      return parsed;
    }
    console.warn("menubar: stored value is not a string array, resetting");
  } catch (e) {
    console.warn("menubar: failed to parse stored value, resetting", e);
  }
  return [];
}

let mutationQueue: Promise<void> = Promise.resolve();

function enqueueMutation(run: () => Promise<void>): Promise<void> {
  const next = mutationQueue.then(run, run);
  mutationQueue = next.catch((e) => {
    console.error("menubar: failed to update symbols", e);
  });
  return next;
}

async function refreshMenuBarCommand() {
  try {
    await launchCommand({ name: "menubar", type: LaunchType.Background });
  } catch (e) {
    // The menu bar command may not be activated yet, in which case there's nothing to refresh.
    console.warn("menubar: unable to refresh menu bar command", e);
  }
}

export function useMenuBarSymbols(): {
  menuBarSymbols: string[];
  menuBarStore: MenuBarStore;
  isLoading: boolean;
} {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from local storage on mount
  useEffect(() => {
    const update = async () => {
      const stored = await loadMenuBarSymbols();
      setSymbols(stored);
      setIsLoading(false);
    };
    update();
  }, []);

  const mutateSymbols = useCallback((mutate: (current: string[]) => string[]) => {
    return enqueueMutation(async () => {
      const current = await loadMenuBarSymbols();
      const next = mutate(current);
      setSymbols(next);
      if (next.length === current.length && next.every((s, i) => s === current[i])) {
        return;
      }
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      await refreshMenuBarCommand();
    });
  }, []);

  const add = useCallback(
    (symbol: string) => {
      mutateSymbols((current) => (current.includes(symbol) ? current : [...current, symbol]));
      showToast({ title: `Added ${symbol} to menu bar` });
    },
    [mutateSymbols],
  );

  const remove = useCallback(
    (symbol: string) => {
      mutateSymbols((current) => current.filter((s) => s !== symbol));
      showToast({ title: `Removed ${symbol} from menu bar` });
    },
    [mutateSymbols],
  );

  return { menuBarSymbols: symbols, menuBarStore: { add, remove }, isLoading };
}
