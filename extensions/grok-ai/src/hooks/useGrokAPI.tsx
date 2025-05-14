import { getPreferenceValues } from "@raycast/api";

// Debug logging utility
function debugLog<T>(message: string, data?: T) {
  console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : "");
}

interface GrokConfig {
  apiKey: string;
  baseURL: string;
}

interface Preferences {
  apiKey: string;
  useStream: boolean;
  isHistoryPaused: boolean;
  isCustomModel: boolean;
}

export function useGrokAPI(): GrokConfig {
  const config = getPreferenceValues<Preferences>();
  debugLog("Grok API Config", {
    apiKey: config.apiKey ? "[SET]" : "[MISSING]",
    baseURL: "https://api.x.ai/v1",
  });

  return {
    apiKey: config.apiKey,
    baseURL: "https://api.x.ai/v1",
  };
}

export function getConfiguration(): Preferences {
  const config = getPreferenceValues<Preferences>();
  debugLog("Configuration Retrieved", {
    apiKey: config.apiKey ? "[SET]" : "[MISSING]",
    useStream: config.useStream,
    isHistoryPaused: config.isHistoryPaused,
  });
  return config;
}
