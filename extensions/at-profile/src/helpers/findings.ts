import { Cache } from "@raycast/api";
import type { CheckStatus } from "../catalog/types";
import { isRecord } from "../utils/is-record";
import { recordProfileOpen } from "./history";
import type { SearchMode, SearchOutcome } from "./search";
import { cleanProfile } from "./url";

/**
 * What Find Profile found for a username, kept so reopening the search shows it again without asking every site.
 * Raycast's Cache, not LocalStorage: it is a disposable copy of answers the sites can give again, so it needs no
 * lock and losing it costs only a new search.
 */
export interface Findings {
  profile: string;
  mode: SearchMode;
  finishedAt: number;
  durationMs: number;
  /** How many sites the search had; fewer outcomes than this means it was canceled partway */
  total: number;
  canceled: boolean;
  /** By search entry key */
  outcomes: Record<string, SearchOutcome>;
  /** What each entry checked (entryIdentity), so an outcome isn't shown for an app whose URL has changed since */
  checked?: Record<string, string>;
}

/** History's app ID for a username searched with Find Profile */
export const FIND_PROFILE_APP_ID = "find-profile";

/** Record a search in History, where it can be searched again */
export const recordSearch = (profile: string) => recordProfileOpen(profile, FIND_PROFILE_APP_ID, "Find Profile");

const cache = new Cache({ namespace: "findings" });
const LAST_KEY = "last";
const profileKey = (profile: string) => `profile:${cleanProfile(profile).toLowerCase()}`;

const STATUSES = new Set<SearchOutcome["status"]>([
  "found",
  "not-found",
  "invalid",
  "blocked",
  "error",
  "unchecked",
] satisfies (CheckStatus | "unchecked")[]);

function toFindings(value: unknown): Findings | undefined {
  if (!isRecord(value) || typeof value.profile !== "string" || !isRecord(value.outcomes)) return undefined;
  const outcomes: Record<string, SearchOutcome> = {};
  for (const [key, outcome] of Object.entries(value.outcomes)) {
    if (isRecord(outcome) && STATUSES.has(outcome.status as SearchOutcome["status"])) {
      outcomes[key] = outcome as SearchOutcome;
    }
  }
  const number = (field: unknown) => (typeof field === "number" && Number.isFinite(field) ? field : 0);
  return {
    profile: value.profile,
    mode: value.mode === "everywhere" ? "everywhere" : "default",
    finishedAt: number(value.finishedAt),
    durationMs: number(value.durationMs),
    total: number(value.total),
    canceled: value.canceled === true,
    outcomes,
    ...(isRecord(value.checked) ? { checked: value.checked as Record<string, string> } : {}),
  };
}

const startOf = (findings: Findings) => findings.finishedAt - findings.durationMs;

/**
 * Keep a search's findings. The view and the AI tool run in separate processes and can overlap, so a search that
 * started earlier never replaces a later one's findings, or the username reopened by default.
 */
export function saveFindings(findings: Findings): void {
  const saved = readFindings(findings.profile);
  if (saved && startOf(saved) > startOf(findings)) return;
  cache.set(profileKey(findings.profile), JSON.stringify(findings));
  const last = lastSearchedProfile();
  const lastFindings = last ? readFindings(last) : undefined;
  if (!lastFindings || startOf(lastFindings) <= startOf(findings)) cache.set(LAST_KEY, findings.profile);
}

export function readFindings(profile: string): Findings | undefined {
  const raw = cache.get(profileKey(profile));
  if (!raw) return undefined;
  try {
    return toFindings(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

/** Clear Search: Find Profile opens empty until the next search. Each username's findings stay for History. */
export function forgetLastSearch(): void {
  cache.remove(LAST_KEY);
}

/** The username Find Profile searched last, for reopening it without an argument */
export function lastSearchedProfile(): string | undefined {
  return cache.get(LAST_KEY) || undefined;
}
