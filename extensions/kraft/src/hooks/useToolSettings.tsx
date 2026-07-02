import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToolMode } from "../runtime/types";
import { mergeToolSettings, ToolSetting, ToolSettings } from "../tool-settings";

const STORAGE_KEY = "toolSettings.v1";

function safeParse(raw: string | undefined): Partial<Record<string, Partial<ToolSetting>>> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch (error) {
    console.error("Failed to parse tool settings:", error);
    return {};
  }
}

export interface ToolSettingsHook {
  data: ToolSettings;
  isLoading: boolean;
  updateToolSetting: (mode: ToolMode, patch: Partial<ToolSetting>) => Promise<void>;
}

export function useToolSettings(): ToolSettingsHook {
  const [data, setData] = useState<ToolSettings>(mergeToolSettings({}));
  const [isLoading, setIsLoading] = useState(true);
  const dataRef = useRef(data);

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      const merged = mergeToolSettings(safeParse(stored));
      dataRef.current = merged;
      setData(merged);
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    dataRef.current = data;
    if (!isLoading) {
      LocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, isLoading]);

  const updateToolSetting = useCallback(async (mode: ToolMode, patch: Partial<ToolSetting>) => {
    const next = {
      ...dataRef.current,
      [mode]: {
        ...dataRef.current[mode],
        ...patch,
      },
    };
    dataRef.current = next;
    setData(next);
  }, []);

  return useMemo(() => ({ data, isLoading, updateToolSetting }), [data, isLoading, updateToolSetting]);
}
