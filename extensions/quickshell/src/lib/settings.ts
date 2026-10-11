import { DEFAULT_SETTINGS, type QuickShellSettings } from "./schema";
import { clampRecentDisplayCount, isRecentSectionEnabled, normalizeRecentCount } from "./migration";

export { clampRecentDisplayCount, isRecentSectionEnabled, normalizeRecentCount };

export const RECENT_SECTION_TITLE = "Recent";

export function createDefaultSettings(): QuickShellSettings {
  return { ...DEFAULT_SETTINGS };
}

export function recentCountFromEnabled(enabled: boolean): number {
  return enabled ? 8 : 0;
}

export function formatRecentCount(count: number): string {
  return String(normalizeRecentCount(count));
}
