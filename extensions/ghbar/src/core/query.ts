import { Settings } from "./settings";

export interface Queries {
  prs: string;
  issues: string;
  review: string;
  changesRequested: string;
  myPullRequests: string;
  /** Some exclusions were dropped to stay under the length cap. */
  filtersDropped: boolean;
  /** Allow-list is on but empty — nothing should be shown. */
  allowListEmpty: boolean;
}

/**
 * Safe ceiling for a GitHub search string. Measured: GraphQL search still
 * works at 3085 characters. The documented 256-character limit applies to
 * REST/web search, not this endpoint.
 */
export const MAX_QUERY_LENGTH = 4000;

export function buildQueries(settings: Settings): Queries {
  const repos = normalizedRepositories(settings);
  const allowListEmpty = settings.repoListIsAllowList && repos.length === 0;

  // An allow-list defines the scope by itself. `org:` and `user:` AND together
  // in one search, so when organizations are set only `org:` is used.
  let scope: string[];
  if (settings.repoListIsAllowList) {
    scope = repos.map((r) => `repo:${r}`);
  } else if (settings.organizations.length > 0) {
    scope = settings.organizations.map((o) => `org:${o}`);
  } else {
    scope = settings.accounts.map((a) => `user:${a}`);
  }

  const exclusions = settings.repoListIsAllowList ? [] : repos.map((r) => `-repo:${r}`);

  let dropped = false;

  // Personal mode: work other people opened on your repositories.
  // Org mode: work assigned to you — you are not the owner there, so
  // `-author:@me` would hide your own PRs instead of narrowing to yours.
  const selfFilter = settings.organizations.length === 0 ? ["-author:@me"] : ["assignee:@me"];

  const assemble = (prefix: string[]): string => {
    const [kept, wasDropped] = fit([...prefix, ...scope, ...selfFilter], exclusions);
    dropped = dropped || wasDropped;
    return kept.join(" ");
  };

  // Review requests are account-independent in personal mode; organizations
  // still narrow them when selected.
  const [reviewParts, reviewDropped] = fit(
    ["is:pr", "is:open", "review-requested:@me", ...settings.organizations.map((o) => `org:${o}`)],
    exclusions,
  );
  dropped = dropped || reviewDropped;

  // `author:@me` narrows enough on its own. Adding `user:` would confine the
  // results to your own repositories and lose PRs you opened elsewhere.
  const authoredScope = settings.repoListIsAllowList
    ? repos.map((r) => `repo:${r}`)
    : settings.organizations.map((o) => `org:${o}`);

  // Your own PRs are excluded from the main search by `-author:@me`; a
  // requested change is a separate, stronger signal.
  const [changesParts, changesDropped] = fit(
    ["is:pr", "is:open", "author:@me", "review:changes_requested", ...authoredScope],
    exclusions,
  );
  dropped = dropped || changesDropped;

  const [mineParts, mineDropped] = fit(["is:pr", "is:open", "author:@me", ...authoredScope], exclusions);
  dropped = dropped || mineDropped;

  return {
    prs: assemble(["is:pr", "is:open"]),
    issues: assemble(["is:issue", "is:open"]),
    review: reviewParts.join(" "),
    changesRequested: changesParts.join(" "),
    myPullRequests: mineParts.join(" "),
    filtersDropped: dropped,
    allowListEmpty,
  };
}

/**
 * Keeps the required parts, appends as many exclusions as fit under the cap.
 * Truncation is never silent — the returned flag becomes a menu warning,
 * because silently dropping filters makes users believe they are applied.
 */
function fit(required: string[], exclusions: string[]): [string[], boolean] {
  const parts = [...required];
  let length = parts.join(" ").length;
  let dropped = false;

  for (const exclusion of exclusions) {
    const addition = exclusion.length + 1;
    if (length + addition > MAX_QUERY_LENGTH) {
      dropped = true;
      break;
    }
    parts.push(exclusion);
    length += addition;
  }
  return [parts, dropped];
}

/** "noisy" -> "alice/noisy"; an entry that already has an owner is kept. */
function normalizedRepositories(settings: Settings): string[] {
  const owner = settings.organizations[0] ?? settings.accounts[0] ?? "@me";
  const result: string[] = [];
  for (const entry of settings.repoList) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) continue;
    result.push(trimmed.includes("/") ? trimmed : `${owner}/${trimmed}`);
  }
  return result;
}

/**
 * Five searches plus profile and rate limit in one request. Measured cost:
 * 1 point.
 *
 * The aliased `search` fields must match the keys the parser expects.
 */
export const QUERY_DOCUMENT = `
query(
  $prs: String!,
  $issues: String!,
  $review: String!,
  $changesRequested: String!,
  $myPullRequests: String!,
  $first: Int!
) {
  viewer {
    login name avatarUrl
    organizations(first: 50) { nodes { login } }
    followers { totalCount }
    following { totalCount }
    # Star total: your own public repositories, forks excluded. Measured:
    # adding these 100 nodes keeps the query at 1 point.
    repositories(
      first: 100
      ownerAffiliations: OWNER
      isFork: false
      privacy: PUBLIC
      orderBy: { field: STARGAZERS, direction: DESC }
    ) {
      totalCount
      nodes { stargazerCount }
    }
  }
  prs: search(query: $prs, type: ISSUE, first: $first) {
    issueCount
    nodes { ... on PullRequest {
      number title url createdAt isDraft
      author { login __typename }
      repository { nameWithOwner }
    } }
  }
  issues: search(query: $issues, type: ISSUE, first: $first) {
    issueCount
    nodes { ... on Issue {
      number title url createdAt
      author { login __typename }
      repository { nameWithOwner }
    } }
  }
  review: search(query: $review, type: ISSUE, first: $first) {
    issueCount
    nodes { ... on PullRequest {
      number title url createdAt isDraft
      author { login __typename }
      repository { nameWithOwner }
    } }
  }
  changesRequested: search(query: $changesRequested, type: ISSUE, first: $first) {
    issueCount
    nodes { ... on PullRequest {
      number title url createdAt isDraft
      author { login __typename }
      repository { nameWithOwner }
    } }
  }
  myPullRequests: search(query: $myPullRequests, type: ISSUE, first: $first) {
    issueCount
    nodes { ... on PullRequest {
      number title url createdAt isDraft
      author { login __typename }
      repository { nameWithOwner }
    } }
  }
  rateLimit { limit remaining resetAt cost }
}
`;

/**
 * A separate, small query for the "Configure Scope" picker.
 *
 * Kept out of the menu-bar query, which runs every ten minutes: carrying a
 * repository list for a screen opened a few times a year is wasted work.
 * This one runs only when the user opens the command.
 *
 * Repositories are ordered by PUSHED_AT — the one you are looking for is
 * almost always among those you touched most recently.
 */
export const CATALOG_QUERY_DOCUMENT = `
query {
  viewer {
    login
    organizations(first: 100) { nodes { login } }
    repositories(
      first: 100
      ownerAffiliations: OWNER
      orderBy: { field: PUSHED_AT, direction: DESC }
    ) {
      nodes { nameWithOwner isPrivate }
    }
  }
}
`;
