import { getPreferenceValues } from "@raycast/api";
import { useMemo } from "react";
import { getConfig } from "../../core/config";

interface PreferencesHook {
  autoPaste: boolean;
  saveToHistory: boolean;
  provider: "ollama" | "openai";
  ollamaUrl: string;
  ollamaModel: string;
  config: ReturnType<typeof getConfig>;
}

export function usePreferences(): PreferencesHook {
  const rawPreferences = getPreferenceValues<{
    provider: "ollama" | "openai";
    ollamaUrl: string;
    ollamaModel: string;
    autoPaste: boolean;
    saveToHistory: boolean;
  }>();

  const config = useMemo(() => getConfig(), []);

  return {
    ...rawPreferences,
    config,
  };
}
