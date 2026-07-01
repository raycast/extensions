import { getPreferenceValues } from "@raycast/api";

import type { DefaultCopyBehavior } from "./types";

export function getOpenRouterApiKey(): string {
  return getPreferenceValues<Preferences>().apiKey.trim();
}

export function getDefaultCopyBehavior(): DefaultCopyBehavior {
  const value = getPreferenceValues<Preferences>().defaultCopyBehavior;

  if (value === "formatted" || value === "unformatted") {
    return value;
  }

  return "unformatted";
}
