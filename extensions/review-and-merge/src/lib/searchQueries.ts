export const CLOSED_REVIEW_WINDOW_DAYS = 30;

export interface SearchScope {
  /** Limit results to repositories owned by this org/owner (`org:` qualifier). */
  organization?: string;
  /**
   * Limit results to specific repositories. Comma- or space-separated list of
   * `owner/repo` entries; each becomes a `repo:` qualifier.
   */
  repositories?: string;
}

/** Split a raw "owner/repo, owner/repo" string into trimmed, non-empty entries. */
export function parseRepositories(repositories: string | undefined): string[] {
  if (!repositories) return [];
  return repositories
    .split(/[\s,]+/)
    .map((repo) => repo.trim())
    .filter(Boolean);
}

function scope(filter: SearchScope = {}): string {
  const parts: string[] = [];
  if (filter.organization) {
    parts.push(`org:${filter.organization}`);
  }
  for (const repo of parseRepositories(filter.repositories)) {
    parts.push(`repo:${repo}`);
  }
  return parts.length ? `${parts.join(" ")} ` : "";
}

export function myOpenPullRequestsQuery(filter: SearchScope = {}): string {
  return `${scope(filter)}is:pr is:open author:@me sort:updated-desc`;
}

export function pendingReviewQuery(filter: SearchScope = {}): string {
  return `${scope(filter)}is:pr is:open review-requested:@me sort:updated-desc`;
}

export function closedUnreviewedQuery(
  now: Date,
  filter: SearchScope = {},
): string {
  const floor = new Date(
    now.getTime() - CLOSED_REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const day = floor.toISOString().slice(0, 10);
  return `${scope(filter)}is:pr is:closed review-requested:@me updated:>=${day} sort:updated-desc`;
}
