// The default model is selected inside the extension and used by Ask.
// Keeping one LocalStorage source avoids settings drifting from the
// model picker when the live catalog changes.

import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "everyapi.defaultModel";

export function useDefaultModel(): {
  model: string;
  setModel: (m: string) => Promise<void>;
  loaded: boolean;
} {
  const [model, setLocal] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (stored && stored.length > 0) setLocal(stored);
      setLoaded(true);
    })();
  }, []);

  const setModel = useCallback(async (m: string) => {
    setLocal(m);
    await LocalStorage.setItem(STORAGE_KEY, m);
  }, []);

  return { model, setModel, loaded };
}

export async function readDefaultModel(): Promise<string> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (stored && stored.length > 0) return stored;
  return "";
}
