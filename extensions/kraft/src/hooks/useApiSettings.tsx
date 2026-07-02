import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiSettings, defaultApiSettings, sanitizeApiSettings } from "../runtime/api-settings";
import { readKeychainPassword, writeKeychainPassword } from "../runtime/keychain";

const STORAGE_KEY = "apiSettings.v1";
const KEYCHAIN_SERVICE = "Kraft API Settings";
const KEYCHAIN_ACCOUNT = "apiKey";

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
      const parsed = safeParse(stored);
      const keychainApiKey = await readKeychainPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
      if (parsed.apiKey && !keychainApiKey) {
        await writeKeychainPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, parsed.apiKey);
      }
      const next = sanitizeApiSettings({
        ...defaultApiSettings,
        ...parsed,
        apiKey: keychainApiKey || parsed.apiKey || "",
      });
      dataRef.current = next;
      setData(next);
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, apiKey: "" }));
      setIsLoading(false);
    })();
  }, []);

  const save = useCallback(async (settings: ApiSettings) => {
    const next = sanitizeApiSettings(settings);
    await writeKeychainPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, next.apiKey);
    dataRef.current = next;
    setData(next);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, apiKey: "" }));
  }, []);

  return useMemo(() => ({ data, isLoading, save }), [data, isLoading, save]);
}
