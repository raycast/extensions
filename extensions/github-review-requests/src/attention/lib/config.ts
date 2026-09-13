/**
 * The extension's persisted configuration: which owners are in scope, which
 * repos and teams are watched, which authors to hide, and the user's saved
 * filters. This is the Raycast counterpart of flex-review's TOML config
 * (internal/config) — same fields, stored in Raycast's LocalStorage instead.
 */
import { LocalStorage, getPreferenceValues } from "@raycast/api";

import type { RepoRef } from "./types";
import { nameWithOwner, parseRepoRef } from "./types";

const CONFIG_KEY = "gh-review.config";

/**
 * A saved PR query. If `raw` is set it is used verbatim as the GitHub search
 * string; otherwise the fields are assembled by {@link searchString}.
 */
export type SavedFilter = {
  name: string;
  raw?: string;
  /** author | assignee | review-requested | mentions | involves */
  role?: string;
  /** "@me" | "some-login" | "team:org/slug" */
  subject?: string;
  /** e.g. ["repo:acme/api", "org:acme"]; empty = use the default scope */
  scopes?: string[];
  /** open | closed | merged (default open) */
  state?: string;
  /** extra qualifiers, e.g. "draft:false label:bug" */
  extra?: string;
};

/**
 * The kinds of activity the background watcher reports on. Each maps to a
 * built-in category, and each can be silenced independently.
 */
export type ActivityKind = "review-requested" | "awaiting-reply" | "my-pr-activity" | "watching";

export const ACTIVITY_KINDS: { kind: ActivityKind; title: string; description: string }[] = [
  {
    kind: "review-requested",
    title: "New review requests",
    description: "A pull request now needs your review",
  },
  {
    kind: "awaiting-reply",
    title: "Replies awaiting you",
    description: "Someone replied on a thread and the ball is in your court",
  },
  {
    kind: "my-pr-activity",
    title: "Activity on my pull requests",
    description: "New comments or reviews on pull requests you opened",
  },
  {
    kind: "watching",
    title: "New pull requests in watched repos",
    description: "A pull request was opened in a repository you watch",
  },
];

/**
 * How intrusive the background watcher is allowed to be. Banners are off by
 * default — the Activity Inbox still fills up silently, so nothing is missed
 * until you decide you want to be interrupted.
 */
export type NotificationSettings = {
  /** Master switch for system banners. The inbox records either way. */
  enabled: boolean;
  /** Per-kind switches, applied only when `enabled` is true. */
  kinds: Record<ActivityKind, boolean>;
  /** Play a sound with each banner. */
  sound: boolean;
  /** Cap on banners per check; the remainder folds into one summary. */
  maxBanners: number;
  /** Start of a do-not-disturb window as "HH:MM", or "" for none. */
  quietFrom: string;
  /** End of the do-not-disturb window as "HH:MM", or "" for none. */
  quietTo: string;
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  enabled: false,
  kinds: {
    "review-requested": true,
    "awaiting-reply": true,
    "my-pr-activity": true,
    watching: false,
  },
  sound: false,
  maxBanners: 5,
  quietFrom: "",
  quietTo: "",
};

export type Config = {
  /**
   * What a filter with no explicit scope searches: "tracked" restricts to the
   * watched repos/orgs, "all" searches everything.
   */
  defaultScope: "tracked" | "all";
  /**
   * Selected organization or personal owners. The persisted field name is kept
   * for compatibility. Empty = search globally (including after migration).
   */
  activeOrgs: string[];
  /** Watched repositories, surfacing as the "Watching" category. */
  repos: RepoRef[];
  /** Teams ("org/slug") watched for the team-review category. Empty = all of mine. */
  watchTeams: string[];
  /**
   * PR authors hidden everywhere (e.g. "dependabot", "renovate"). Stored
   * normalized: lowercased, without a "[bot]" suffix.
   */
  ignoredAuthors: string[];
  /** Toggles the built-in categories (needs review, team, mine, awaiting reply). */
  showBuiltins: boolean;
  /**
   * Set once your own account has been offered to the scope, so taking
   * yourself back out is not undone on the next launch.
   */
  ownerSeeded?: boolean;
  /** User-defined saved filters. */
  filters: SavedFilter[];
  /** Desktop-notification behaviour for the background watcher. */
  notifications: NotificationSettings;
};

/**
 * Common bot / automation accounts hidden out of the box on first run. Users
 * can toggle any of these back on from the settings command.
 */
export const DEFAULT_IGNORED_AUTHORS = [
  "dependabot",
  // The legacy Dependabot account, still the author of record on older PRs.
  "dependabot-preview",
  "renovate",
  "github-actions",
  "copilot",
  "copilot-swe-agent",
  "mergify",
  "snyk-bot",
  "imgbot",
  "pre-commit-ci",
  "allcontributors",
];

export const DEFAULT_CONFIG: Config = {
  defaultScope: "all",
  activeOrgs: [],
  repos: [],
  watchTeams: [],
  ignoredAuthors: [...DEFAULT_IGNORED_AUTHORS],
  showBuiltins: true,
  filters: [],
  notifications: DEFAULT_NOTIFICATIONS,
};

/** Reads the stored config, filling in any missing fields with defaults. */
export async function loadConfig(): Promise<Config> {
  const owners = (getPreferenceValues<Preferences>().owners ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const defaults = { ...DEFAULT_CONFIG, activeOrgs: owners };
  const raw = await LocalStorage.getItem<string>(CONFIG_KEY);
  if (!raw) return structuredClone(defaults);
  try {
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      // Guard against partially-written or hand-edited state.
      activeOrgs: parsed.activeOrgs ?? owners,
      repos: parsed.repos ?? [],
      watchTeams: parsed.watchTeams ?? [],
      ignoredAuthors: parsed.ignoredAuthors ?? [],
      filters: parsed.filters ?? [],
      notifications: {
        ...DEFAULT_NOTIFICATIONS,
        ...(parsed.notifications ?? {}),
        kinds: { ...DEFAULT_NOTIFICATIONS.kinds, ...(parsed.notifications?.kinds ?? {}) },
      },
    };
  } catch {
    return structuredClone(defaults);
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await LocalStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// ---------------------------------------------------------------------------
// Authors
// ---------------------------------------------------------------------------

/**
 * Canonicalizes an author login for comparison: lowercased, without a trailing
 * "[bot]" or leading "app/" — so "dependabot[bot]", "app/dependabot" and
 * "Dependabot" all match.
 */
export function normalizeAuthor(s: string): string {
  let out = s.trim().toLowerCase();
  if (out.endsWith("[bot]")) out = out.slice(0, -"[bot]".length);
  if (out.startsWith("app/")) out = out.slice("app/".length);
  return out;
}

/** Reports whether a login is on the given ignore list. */
export function authorIgnoredBy(ignoredAuthors: string[], login: string): boolean {
  if (!login) return false;
  const n = normalizeAuthor(login);
  return ignoredAuthors.some(a => normalizeAuthor(a) === n);
}

/** Reports whether a PR author login is on the config's ignore list. */
export function isAuthorIgnored(config: Config, login: string): boolean {
  return authorIgnoredBy(config.ignoredAuthors, login);
}

// ---------------------------------------------------------------------------
// Owner scope
// ---------------------------------------------------------------------------

/** Reports whether an organization scope is active (vs. searching globally). */
export function orgScoped(config: Config): boolean {
  return config.activeOrgs.length > 0;
}

/** Reports whether `owner` falls within the active-org scope. */
export function orgActive(config: Config, owner: string): boolean {
  if (config.activeOrgs.length === 0) return true;
  return config.activeOrgs.some(o => o.toLowerCase() === owner.toLowerCase());
}

/**
 * GitHub user: accepts both organization and personal repository owners,
 * preserving the legacy Owners preference without account-type lookups.
 * Multiple user: qualifiers are ORed; an empty selection searches globally.
 */
export function ownerScopeTokens(config: Config): string[] {
  return config.activeOrgs.map(owner => `user:${owner}`);
}

export function ownerQualifier(config: Config): string {
  return ownerScopeTokens(config)
    .map(token => ` ${token}`)
    .join("");
}

/**
 * Puts your own account in scope the first time the extension knows who you
 * are, so your repositories show without hunting for the setting. It runs
 * once — the flag it leaves behind means removing yourself afterwards sticks.
 *
 * An empty scope is left alone: it already searches everywhere, your own
 * repositories included, and narrowing it to just you would hide the review
 * requests that arrive from organizations.
 */
export async function ensureOwnerInScope(config: Config, login: string): Promise<Config> {
  if (config.ownerSeeded || !login) return config;

  const next: Config = { ...config, ownerSeeded: true };
  if (config.activeOrgs.length > 0 && !config.activeOrgs.some(o => o.toLowerCase() === login.toLowerCase())) {
    next.activeOrgs = [login, ...config.activeOrgs];
  }
  await saveConfig(next);
  return next;
}

/**
 * Watched repos as "owner/name". Every one of them counts: you picked the
 * repository by hand, so narrowing the owner scope later hides its pull
 * requests nowhere — the two selections add up rather than cancelling out.
 */
export function watchedRepoNames(config: Config): string[] {
  return config.repos.map(nameWithOwner);
}

/**
 * Scope for the sweep that lists a repository's pull requests whatever their
 * author, rather than only the ones you opened or were asked to review.
 *
 * Everything you selected counts, the way GitHub ORs scope qualifiers: the
 * owners in scope plus any repository you watch. Watching one repository adds
 * it, it does not quietly drop the organizations you already picked. With
 * nothing configured at all this falls back to your own account, which is what
 * makes your repositories show by default.
 */
export function watchedScopeTokens(config: Config, login: string): string[] {
  // No owner scope means everywhere, and your own repositories are the part of
  // everywhere this sweep can usefully cover.
  const owners = config.activeOrgs.length > 0 ? config.activeOrgs : login ? [login] : [];
  const sameOwner = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const tokens: string[] = [];

  for (const owner of owners) {
    const picked = config.repos.filter(r => sameOwner(r.owner, owner));
    // Watching repositories inside an owner is a statement about that owner:
    // sweep those repositories rather than everything it holds. An owner you
    // picked no repositories from stays whole.
    if (picked.length > 0) tokens.push(...picked.map(r => `repo:${nameWithOwner(r)}`));
    else tokens.push(`user:${owner}`);
  }

  // A watched repository outside the owner scope is still an explicit choice.
  for (const repo of config.repos) {
    if (!owners.some(o => sameOwner(o, repo.owner))) tokens.push(`repo:${nameWithOwner(repo)}`);
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Filters → search strings
// ---------------------------------------------------------------------------

/**
 * repo:/user: tokens derived from the watched config when defaultScope is
 * "tracked"; otherwise nothing.
 */
function scopeTokens(config: Config): string[] {
  if (config.defaultScope !== "tracked") return [];
  return [...ownerScopeTokens(config), ...config.repos.map(r => `repo:${nameWithOwner(r)}`)];
}

/**
 * Compiles a saved filter into a GitHub issue-search query string.
 *
 * If `raw` is set it is returned verbatim. Otherwise the query is assembled as
 * `is:pr is:<state> <role>:<subject> <scope tokens> <extra>`.
 *
 * A subject of "team:org/slug" becomes the dedicated
 * `team-review-requested:org/slug` qualifier, since teams can only be
 * review-requested.
 */
export function searchString(filter: SavedFilter, config: Config): string {
  const raw = filter.raw?.trim();
  if (raw) return raw;

  const parts = ["is:pr", `is:${filter.state?.trim() || "open"}`];

  const role = filter.role?.trim();
  if (role) {
    const subject = filter.subject?.trim() ?? "";
    if (subject.startsWith("team:")) {
      parts.push(`team-review-requested:${subject.slice("team:".length)}`);
    } else if (subject) {
      parts.push(`${role}:${subject}`);
    }
  }

  const scopes = filter.scopes?.length ? filter.scopes : scopeTokens(config);
  parts.push(...scopes);

  const extra = filter.extra?.trim();
  if (extra) parts.push(extra);

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Mutators — each returns a new Config, ready to hand to saveConfig
// ---------------------------------------------------------------------------

export function withIgnoredAuthors(config: Config, authors: string[]): Config {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of authors) {
    const k = normalizeAuthor(a);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return { ...config, ignoredAuthors: out };
}

export function withAuthorIgnored(config: Config, login: string): Config {
  return withIgnoredAuthors(config, [...config.ignoredAuthors, login]);
}

export function withoutAuthorIgnored(config: Config, login: string): Config {
  const n = normalizeAuthor(login);
  return { ...config, ignoredAuthors: config.ignoredAuthors.filter(a => normalizeAuthor(a) !== n) };
}

/**
 * Replaces the watched repos belonging to the active orgs with `selected`
 * ("owner/name"), leaving repos from other orgs untouched.
 */
export function withWatchedRepos(config: Config, selected: string[]): Config {
  const kept = config.repos.filter(r => orgScoped(config) && !orgActive(config, r.owner));
  const added = selected.map(parseRepoRef).filter((r): r is RepoRef => r !== undefined);
  return { ...config, repos: [...kept, ...added] };
}

/**
 * Replaces the watched teams belonging to the active orgs with `selected`
 * ("org/slug"), keeping teams from other orgs untouched.
 */
export function withWatchedTeams(config: Config, selected: string[]): Config {
  const teamOrg = (id: string) => id.split("/")[0] ?? "";
  const kept = config.watchTeams.filter(t => !orgScoped(config) || !orgActive(config, teamOrg(t)));
  return { ...config, watchTeams: [...kept, ...selected] };
}

/** Adds a filter, or replaces the existing one with the same name. */
export function withFilter(config: Config, filter: SavedFilter, replacingName?: string): Config {
  const target = replacingName ?? filter.name;
  const filters = [...config.filters];
  const index = filters.findIndex(f => f.name === target);
  if (index >= 0) {
    filters[index] = filter;
  } else {
    filters.push(filter);
  }
  return { ...config, filters };
}

export function withoutFilter(config: Config, name: string): Config {
  return { ...config, filters: config.filters.filter(f => f.name !== name) };
}
