import { getPreferenceValues, type Application } from "@raycast/api";
import { DEFAULT_ENGINE, ENGINE_IDS, type EngineId } from "./searchEngines";

// `Preferences` is the Raycast-auto-generated global type (raycast-env.d.ts,
// = ExtensionPreferences). package.json's `preferences` array is the single
// source of truth — do not hand-write a duplicate interface here.

export interface ResolvedPrefs {
  engine: EngineId;
  customSearchUrl?: string;
  browser?: Application;
  openUrlsDirectly: boolean;
}

export function resolvePreferences(raw: Preferences): ResolvedPrefs {
  const engine = ENGINE_IDS.includes(raw.engine as EngineId) ? (raw.engine as EngineId) : DEFAULT_ENGINE;
  return {
    engine,
    customSearchUrl: raw.customSearchUrl?.trim() || undefined,
    browser: raw.browser,
    openUrlsDirectly: raw.openUrlsDirectly,
  };
}

/** Convenience wrapper used by command entries. */
export function getResolvedPreferences(): ResolvedPrefs {
  return resolvePreferences(getPreferenceValues<Preferences>());
}
