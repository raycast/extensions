import { getPreferenceValues } from "@raycast/api";

import type { DefaultCopyBehavior } from "./types";

export interface ExtensionPreferences {
  apiKey: string;
  defaultCopyBehavior?: string;
}

export function getOpenRouterApiKey(): string {
  return getPreferenceValues<ExtensionPreferences>().apiKey.trim();
}

export function getDefaultCopyBehavior(): DefaultCopyBehavior {
  const value = getPreferenceValues<ExtensionPreferences>().defaultCopyBehavior;

  if (value === "formatted" || value === "unformatted") {
    return value;
  }

  return "unformatted";
}
