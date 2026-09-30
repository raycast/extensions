import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

export interface Settings {
  usagePct: number;
  requestCost: number;

  country: string;
}

const LS_KEY = "settings-v1";

export const DEFAULT_SETTINGS: Settings = {
  usagePct: 0,
  requestCost: 0.3,
  country: "FR",
};

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(false);

  useEffect(() => {
    LocalStorage.getItem<string>(LS_KEY).then((saved) => {
      if (saved == null) {
        setIsFirstRun(true);
      } else {
        try {
          const parsed = JSON.parse(saved) as Partial<Settings>;
          setSettingsState({ ...DEFAULT_SETTINGS, ...parsed });
        } catch {
          // Corrupted data — treat as first run
          setIsFirstRun(true);
        }
      }
      setIsLoaded(true);
    });
  }, []);

  async function updateSettings(next: Settings): Promise<void> {
    await LocalStorage.setItem(LS_KEY, JSON.stringify(next));
    setSettingsState(next);
    setIsFirstRun(false);
  }

  return { settings, isLoaded, isFirstRun, updateSettings };
}
