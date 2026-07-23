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

  const updateSymbols = useCallback(
    async (newSymbols: string[]) => {
      setSymbols(newSymbols);
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(newSymbols));
      await refreshMenuBarCommand();
    },
    [setSymbols],
  );

  const add = useCallback(
    (symbol: string) => {
      if (symbols.includes(symbol)) {
        return;
      }
      updateSymbols([...symbols, symbol]);
      showToast({ title: `Added ${symbol} to menu bar` });
    },
    [symbols, updateSymbols],
  );

  const remove = useCallback(
    (symbol: string) => {
      if (!symbols.includes(symbol)) {
        return;
      }
      updateSymbols(symbols.filter((s) => s !== symbol));
      showToast({ title: `Removed ${symbol} from menu bar` });
    },
    [symbols, updateSymbols],
  );

  return { menuBarSymbols: symbols, menuBarStore: { add, remove }, isLoading };
}
