import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiSettings, defaultApiSettings, sanitizeApiSettings } from "../runtime/api-settings";

const STORAGE_KEY = "apiSettings.v1";

function safeParse(raw: string | undefined): Partial<ApiSettings> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch (error) {
    console.error("Failed to parse API settings:", error);
    return {};
  }
}

export interface ApiSettingsHook {
  data: ApiSettings;
  isLoading: boolean;
  save: (settings: ApiSettings) => Promise<void>;
}

export function useApiSettings(): ApiSettingsHook {
  const [data, setData] = useState<ApiSettings>(defaultApiSettings);
  const [isLoading, setIsLoading] = useState(true);
  const dataRef = useRef(data);

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      const next = sanitizeApiSettings({ ...defaultApiSettings, ...safeParse(stored) });
      dataRef.current = next;
      setData(next);
      setIsLoading(false);
    })();
  }, []);

  const save = useCallback(async (settings: ApiSettings) => {
    const next = sanitizeApiSettings(settings);
    dataRef.current = next;
    setData(next);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return useMemo(() => ({ data, isLoading, save }), [data, isLoading, save]);
}
