import { SectionKind } from "./models";

/** When the rate-limit row appears in the menu. */
export type RateLimitVisibility = "never" | "whenLow" | "always";

/** Where the gauge turns orange — the point the number becomes actionable. */
export const RATE_LIMIT_LOW_THRESHOLD = 0.25;

export function rateLimitShows(visibility: RateLimitVisibility, fraction: number): boolean {
  switch (visibility) {
    case "never":
      return false;
    case "whenLow":
      return fraction < RATE_LIMIT_LOW_THRESHOLD;
    case "always":
      return true;
  }
}

export interface Settings {
  accounts: string[];
  /**
   * When non-empty the search uses `org:` and REPLACES `accounts`. GitHub ANDs
   * `user:` with `org:` in one query, so combining them always returns nothing.
   */
  organizations: string[];
  repoList: string[];
  repoListIsAllowList: boolean;
  showBots: boolean;
  showDrafts: boolean;
  showPullRequests: boolean;
  showIssues: boolean;
  showReviewRequested: boolean;
  showChangesRequested: boolean;
  showMyPullRequests: boolean;
  /** A repository with more items than this collapses into one row. 0 disables it. */
  repoGroupThreshold: number;
  /** Top-level rows per section; the rest move into a submenu. */
  maxRowsPerSection: number;
  rateLimitVisibility: RateLimitVisibility;
}

export const DEFAULT_SETTINGS: Settings = {
  accounts: ["@me"],
  organizations: [],
  repoList: [],
  repoListIsAllowList: false,
  showBots: false,
  showDrafts: true,
  showPullRequests: true,
  showIssues: true,
  showReviewRequested: true,
  showChangesRequested: true,
  showMyPullRequests: true,
  repoGroupThreshold: 3,
  maxRowsPerSection: 5,
  rateLimitVisibility: "whenLow",
};

export function visibleSections(settings: Settings): Set<SectionKind> {
  const result = new Set<SectionKind>();
  if (settings.showPullRequests) result.add("pullRequests");
  if (settings.showIssues) result.add("issues");
  if (settings.showReviewRequested) result.add("reviewRequested");
  if (settings.showChangesRequested) result.add("changesRequested");
  if (settings.showMyPullRequests) result.add("myPullRequests");
  return result;
}

/**
 * Raycast preferences as they arrive: checkboxes as booleans, textfields and
 * dropdowns as strings, every field optional.
 *
 * Deliberately independent of the generated `Preferences` type so that the
 * core imports no Raycast API and this mapping is testable without Raycast.
 */
export interface RawSettings {
  showPullRequests?: boolean;
  showIssues?: boolean;
  showReviewRequested?: boolean;
  showChangesRequested?: boolean;
  showMyPullRequests?: boolean;
  showBots?: boolean;
  showDrafts?: boolean;
  accounts?: string;
  organizations?: string;
  repositoryFilterMode?: string;
  repositoryList?: string;
  repoGroupThreshold?: string;
  maxRowsPerSection?: string;
  rateLimitVisibility?: string;
}

export type RepositoryFilterMode = "off" | "allow" | "deny";

/** "alice, bob ,, " -> ["alice", "bob"] */
export function splitList(value: string | undefined): string[] {
  if (value === undefined) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseIntOr(value: string | undefined, fallback: number, minimum: number): number {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, parsed);
}

function parseFilterMode(value: string | undefined): RepositoryFilterMode {
  return value === "allow" || value === "deny" ? value : "off";
}

function parseRateLimitVisibility(value: string | undefined): RateLimitVisibility {
  return value === "never" || value === "always" || value === "whenLow" ? value : "whenLow";
}

/**
 * Two decisions live here:
 *
 * 1. An empty `accounts` falls back to `["@me"]`. Clearing it means "back to
 *    the default", not "watch nobody" — an empty list would leave every query
 *    unscoped and pull in work from all of GitHub.
 *
 * 2. When the repository filter is OFF the list is ignored entirely.
 *    Otherwise a stale list would keep filtering silently while the
 *    preferences pane says "off", which is impossible to diagnose.
 */
export function settingsFromRaw(raw: RawSettings): Settings {
  const accounts = splitList(raw.accounts);
  const filterMode = parseFilterMode(raw.repositoryFilterMode);
  const repoList = filterMode === "off" ? [] : splitList(raw.repositoryList);

  return {
    accounts: accounts.length > 0 ? accounts : ["@me"],
    organizations: splitList(raw.organizations),
    repoList,
    repoListIsAllowList: filterMode === "allow",
    showBots: raw.showBots ?? DEFAULT_SETTINGS.showBots,
    showDrafts: raw.showDrafts ?? DEFAULT_SETTINGS.showDrafts,
    showPullRequests: raw.showPullRequests ?? DEFAULT_SETTINGS.showPullRequests,
    showIssues: raw.showIssues ?? DEFAULT_SETTINGS.showIssues,
    showReviewRequested: raw.showReviewRequested ?? DEFAULT_SETTINGS.showReviewRequested,
    showChangesRequested: raw.showChangesRequested ?? DEFAULT_SETTINGS.showChangesRequested,
    showMyPullRequests: raw.showMyPullRequests ?? DEFAULT_SETTINGS.showMyPullRequests,
    repoGroupThreshold: parseIntOr(raw.repoGroupThreshold, DEFAULT_SETTINGS.repoGroupThreshold, 0),
    maxRowsPerSection: parseIntOr(raw.maxRowsPerSection, DEFAULT_SETTINGS.maxRowsPerSection, 1),
    rateLimitVisibility: parseRateLimitVisibility(raw.rateLimitVisibility),
  };
}
