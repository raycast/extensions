import { getPreferenceValues } from "@raycast/api";

// ─── Types ───────────────────────────────────────────────────────────

export interface Preferences {
  readonly ollamaUrl: string;
  readonly defaultModel: string;
  readonly searxngUrl: string;
  readonly maxResults: string;
  readonly maxContentLength: string;
}

// ─── Defaults ────────────────────────────────────────────────────────

const DEFAULT_MAX_RESULTS = 5;
const MIN_MAX_RESULTS = 1;
const MAX_MAX_RESULTS = 10;

const DEFAULT_MAX_CONTENT_LENGTH = 4000;
const MIN_CONTENT_LENGTH = 500;
const MAX_CONTENT_LENGTH = 10000;

// ─── Public API ──────────────────────────────────────────────────────

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getMaxResults(prefs: Preferences): number {
  const parsed = parseInt(prefs.maxResults, 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_MAX_RESULTS;
  }
  return Math.max(MIN_MAX_RESULTS, Math.min(parsed, MAX_MAX_RESULTS));
}

export function getMaxContentLength(prefs: Preferences): number {
  const parsed = parseInt(prefs.maxContentLength, 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_MAX_CONTENT_LENGTH;
  }
  return Math.max(MIN_CONTENT_LENGTH, Math.min(parsed, MAX_CONTENT_LENGTH));
}
