/**
 * Dates are ISO 8601 strings, not `Date`. These objects go into the
 * `useCachedPromise` cache, which must be JSON-serializable: a `Date` would
 * survive the write but come back as a string, making the type lie.
 */

export type ItemKind = "pullRequest" | "issue";

export interface Item {
  kind: ItemKind;
  /** "owner/name" */
  repository: string;
  number: number;
  title: string;
  /** Also the identity: this is the key the seen record uses. */
  url: string;
  /** ISO 8601 */
  createdAt: string;
  isDraft: boolean;
  authorLogin: string;
  authorIsBot: boolean;
}

/** "owner/name" -> "name" */
export function repositoryName(repository: string): string {
  const parts = repository.split("/");
  return parts.length > 1 ? parts[parts.length - 1] : repository;
}

export interface Viewer {
  login: string;
  name: string | null;
  avatarURL: string;
  organizations: string[];
}

export function displayName(viewer: Viewer): string {
  return viewer.name ?? viewer.login;
}

export function profileURL(viewer: Viewer): string {
  return `https://github.com/${viewer.login}`;
}

/**
 * When `starsAreExact` is false the star total is a LOWER BOUND — only the
 * first 100 repositories are counted. The menu marks this with a "+".
 */
export interface Social {
  stars: number;
  followers: number;
  following: number;
  starsAreExact: boolean;
}

export const EMPTY_SOCIAL: Social = { stars: 0, followers: 0, following: 0, starsAreExact: true };

export interface RateLimit {
  limit: number;
  remaining: number;
  /** ISO 8601 */
  resetAt: string;
}

export function rateLimitFraction(limit: RateLimit): number {
  return limit.limit > 0 ? limit.remaining / limit.limit : 1;
}

export type SectionKind = "pullRequests" | "issues" | "reviewRequested" | "changesRequested" | "myPullRequests";

export const ALL_SECTION_KINDS: SectionKind[] = [
  "pullRequests",
  "issues",
  "reviewRequested",
  "changesRequested",
  "myPullRequests",
];

/**
 * Menu order AND dedupe priority: when the same pull request matches several
 * searches, the section listed first claims it. One list on purpose — keeping
 * the two separate let the strongest signal render fourth.
 */
export const DISPLAY_ORDER: SectionKind[] = [
  "changesRequested",
  "reviewRequested",
  "pullRequests",
  "issues",
  "myPullRequests",
];

export const SECTION_TITLE: Record<SectionKind, string> = {
  pullRequests: "Pull Requests",
  issues: "Issues",
  reviewRequested: "Review Requested",
  changesRequested: "Changes Requested",
  myPullRequests: "My Pull Requests",
};

/** A menu row: either a single item, or items collapsed by repository. */
export type Row = { type: "item"; item: Item } | { type: "group"; repository: string; items: Item[] };

export function rowItems(row: Row): Item[] {
  return row.type === "item" ? [row.item] : row.items;
}

export interface MenuSection {
  kind: SectionKind;
  rows: Row[];
  /** The search hit GitHub's 100-result ceiling; the user must be told. */
  truncated: boolean;
}

export function sectionItems(section: MenuSection): Item[] {
  return section.rows.flatMap(rowItems);
}

export interface Snapshot {
  viewer: Viewer;
  social: Social;
  prs: Item[];
  issues: Item[];
  review: Item[];
  changesRequested: Item[];
  myPullRequests: Item[];
  rateLimit: RateLimit;
  /** An array rather than a Set: the cache is written as JSON. */
  truncated: SectionKind[];
}

/** Live lists the "Configure Scope" command picks from. */
export interface Catalog {
  login: string;
  organizations: string[];
  repositories: CatalogRepository[];
}

export interface CatalogRepository {
  /** "owner/name" */
  nameWithOwner: string;
  isPrivate: boolean;
}
