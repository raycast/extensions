import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppSettings, defaultAppSettings, sanitizeAppSettings } from "../runtime/app-settings";

const STORAGE_KEY = "appSettings.v1";

function safeParse(raw: string | undefined): Partial<AppSettings> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch (error) {
    console.error("Failed to parse app settings:", error);
    return {};
  }
}

export async function readAppSettings(): Promise<AppSettings> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  return sanitizeAppSettings({ ...defaultAppSettings, ...safeParse(stored) });
}

export interface AppSettingsHook {
  data: AppSettings;
  isLoading: boolean;
  save: (settings: AppSettings) => Promise<void>;
}

export function useAppSettings(): AppSettingsHook {
  const [data, setData] = useState<AppSettings>(defaultAppSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setData(await readAppSettings());
      setIsLoading(false);
    })();
  }, []);

  const save = useCallback(async (settings: AppSettings) => {
    const next = sanitizeAppSettings(settings);
    setData(next);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return useMemo(() => ({ data, isLoading, save }), [data, isLoading, save]);
}
