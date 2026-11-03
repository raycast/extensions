import { getPreferenceValues } from "@raycast/api";
import type { ProviderId } from "./types";

/** Declared here so type checks do not depend on the generated `raycast-env.d.ts`. */
interface KeyPreferences {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
  openrouterApiKey?: string;
}

export type ApiKeys = Partial<Record<ProviderId, string>>;

/** Keys live only in Raycast's password preferences, so they are read on demand and never copied into storage. */
export function getApiKeys(): ApiKeys {
  const preferences = getPreferenceValues<KeyPreferences>();
  return {
    anthropic: preferences.anthropicApiKey?.trim() || undefined,
    openai: preferences.openaiApiKey?.trim() || undefined,
    gemini: preferences.geminiApiKey?.trim() || undefined,
    openrouter: preferences.openrouterApiKey?.trim() || undefined,
  };
}

export function hasAnyApiKey(keys: ApiKeys = getApiKeys()): boolean {
  return Object.values(keys).some((key) => key !== undefined);
}
