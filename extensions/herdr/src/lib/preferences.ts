import { getPreferenceValues } from "@raycast/api";

export type HerdrPreferences = Preferences;

export function getHerdrPreferences(): HerdrPreferences {
  return getPreferenceValues<HerdrPreferences>();
}

export function getRefreshIntervalMs(): number {
  const value = Number(getHerdrPreferences().refreshInterval || "5");
  return Math.max(2, Number.isFinite(value) ? value : 5) * 1_000;
}

export function getOutputLines(): number {
  const value = Number(getHerdrPreferences().outputLines || "150");
  return Math.min(2_000, Math.max(20, Number.isFinite(value) ? value : 150));
}
