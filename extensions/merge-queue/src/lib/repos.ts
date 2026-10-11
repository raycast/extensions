import { graphql, RepoConfig } from "./gh";

export type RepoChoice = {
  owner: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  isPrivate: boolean;
  stars: number;
  pushedAt?: string;
  defaultBranch?: string;
  queueBranch?: string;
  queued?: number;
  yourQueued: number;
};

export type RepoSelection = { owner: string; name: string; branch?: string };

export type RepoSort = "pushed" | "stars" | "match";

export type RawRepo = {
  nameWithOwner: string;
  owner: { login: string; avatarUrl: string };
  isPrivate: boolean;
  isArchived: boolean;
  stargazerCount: number;
  pushedAt: string | null;
  defaultBranchRef: { name: string } | null;
  mergeQueue: { entries: { totalCount: number } } | null;
  rulesets: {
    nodes: ({
      enforcement: string;
      conditions: { refName: { include: string[] } | null } | null;
      rules: { totalCount: number };
    } | null)[];
  } | null;
};

type RawPullRequest = {
  baseRefName: string;
  mergeQueueEntry: { position: number } | null;
  baseRepository: RawRepo | null;
};

export type ChoicesResponse = {
  viewer: {
    pullRequests: { nodes: (RawPullRequest | null)[] };
    repositories: { nodes: (RawRepo | null)[] };
    repositoriesContributedTo: { nodes: (RawRepo | null)[] };
  };
};

export type SearchResponse = {
  search: { nodes: (RawRepo | Record<string, never> | null)[] };
};

const REPO_FRAGMENT = `
fragment Repo on Repository {
  nameWithOwner
  owner { login avatarUrl }
  isPrivate
  isArchived
  stargazerCount
  pushedAt
  defaultBranchRef { name }
  mergeQueue { entries { totalCount } }
  rulesets(first: 10, includeParents: true) {
    nodes { enforcement conditions { refName { include } } rules(type: MERGE_QUEUE) { totalCount } }
  }
}`;

const CHOICES_QUERY = `
query {
  viewer {
    pullRequests(first: 50, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { baseRefName mergeQueueEntry { position } baseRepository { ...Repo } }
    }
    repositories(
      first: 50
      affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
      ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
      orderBy: { field: PUSHED_AT, direction: DESC }
    ) { nodes { ...Repo } }
    repositoriesContributedTo(
      first: 25
      includeUserRepositories: false
      contributionTypes: [COMMIT, PULL_REQUEST]
      orderBy: { field: PUSHED_AT, direction: DESC }
    ) { nodes { ...Repo } }
  }
}
${REPO_FRAGMENT}`;

const SEARCH_QUERY = `
query($searchText: String!) {
  search(query: $searchText, type: REPOSITORY, first: 30) { nodes { ...Repo } }
}
${REPO_FRAGMENT}`;

const REPO_QUERY = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) { ...Repo }
}
${REPO_FRAGMENT}`;

function isRepo(node: RawRepo | Record<string, never> | null | undefined): node is RawRepo {
  return Boolean(node && "nameWithOwner" in node);
}

export function rulesetQueueBranch(raw: RawRepo): string | undefined {
  const defaultBranch = raw.defaultBranchRef?.name;
  for (const ruleset of raw.rulesets?.nodes ?? []) {
    if (!ruleset || ruleset.enforcement !== "ACTIVE" || ruleset.rules.totalCount === 0) {
      continue;
    }
    for (const pattern of ruleset.conditions?.refName?.include ?? []) {
      if (pattern === "~DEFAULT_BRANCH" && defaultBranch) {
        return defaultBranch;
      }
      const exact = /^refs\/heads\/([^*?[\]]+)$/.exec(pattern);
      if (exact) {
        return exact[1];
      }
    }
  }
  return undefined;
}

export function toChoice(raw: RawRepo, queuedHere?: { branch: string; count: number }): RepoChoice {
  const [owner, name] = raw.nameWithOwner.split("/");
  const defaultBranch = raw.defaultBranchRef?.name;
  const queueBranch = queuedHere?.branch ?? (raw.mergeQueue ? defaultBranch : rulesetQueueBranch(raw));
  const onDefault = queueBranch !== undefined && queueBranch === defaultBranch;
  return {
    owner,
    name,
    slug: raw.nameWithOwner,
    avatarUrl: raw.owner.avatarUrl || undefined,
    isPrivate: raw.isPrivate,
    stars: raw.stargazerCount,
    pushedAt: raw.pushedAt ?? undefined,
    defaultBranch,
    queueBranch,
    queued: onDefault ? raw.mergeQueue?.entries.totalCount : undefined,
    yourQueued: queuedHere?.count ?? 0,
  };
}

function byRecentPush(a: RepoChoice, b: RepoChoice): number {
  return (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "");
}

export function parseChoices(data: ChoicesResponse): RepoChoice[] {
  const queuedByRepo = new Map<string, { raw: RawRepo; branch: string; count: number }>();
  for (const pr of data.viewer.pullRequests.nodes) {
    if (!pr?.mergeQueueEntry || !pr.baseRepository) {
      continue;
    }
    const existing = queuedByRepo.get(pr.baseRepository.nameWithOwner);
    queuedByRepo.set(pr.baseRepository.nameWithOwner, {
      raw: pr.baseRepository,
      branch: existing?.branch ?? pr.baseRefName,
      count: (existing?.count ?? 0) + 1,
    });
  }

  const choices = new Map<string, RepoChoice>();
  for (const { raw, branch, count } of queuedByRepo.values()) {
    choices.set(raw.nameWithOwner, toChoice(raw, { branch, count }));
  }
  const rest = [...data.viewer.repositories.nodes, ...data.viewer.repositoriesContributedTo.nodes];
  for (const raw of rest) {
    if (isRepo(raw) && !raw.isArchived && !choices.has(raw.nameWithOwner)) {
      choices.set(raw.nameWithOwner, toChoice(raw));
    }
  }
  return [...choices.values()];
}

export function parseSearch(data: SearchResponse, exact?: RawRepo | null): RepoChoice[] {
  const nodes = [exact, ...data.search.nodes].filter(isRepo);
  const seen = new Set<string>();
  return nodes
    .filter((raw) => !seen.has(raw.nameWithOwner) && Boolean(seen.add(raw.nameWithOwner)))
    .map((raw) => toChoice(raw));
}

export function groupChoices(choices: RepoChoice[], sort: RepoSort = "match") {
  const ordered =
    sort === "pushed"
      ? [...choices].sort(byRecentPush)
      : sort === "stars"
        ? [...choices].sort((a, b) => b.stars - a.stars)
        : choices;
  return {
    yours: ordered.filter((choice) => choice.yourQueued > 0),
    withQueue: ordered.filter((choice) => choice.yourQueued === 0 && choice.queueBranch !== undefined),
    others: ordered.filter((choice) => choice.queueBranch === undefined),
  };
}

const SORT_QUALIFIER: Record<RepoSort, string> = { pushed: "sort:updated", stars: "sort:stars", match: "" };

export function parseTypedRepo(text: string): RepoSelection | undefined {
  const match = /^\s*(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?(?::([^\s]+))?\s*$/.exec(text);
  return match ? { owner: match[1], name: match[2], branch: match[3] } : undefined;
}

export function searchText(text: string, sort: RepoSort): string {
  const typed = parseTypedRepo(text);
  const terms = `${typed ? typed.name : text.trim()} in:name`;
  return [terms, "archived:false", SORT_QUALIFIER[sort]].filter(Boolean).join(" ");
}

export async function fetchRepoChoices(config: Pick<RepoConfig, "ghPath">): Promise<RepoChoice[]> {
  return parseChoices(await graphql<ChoicesResponse>(config, CHOICES_QUERY, {}));
}

export async function searchRepoChoices(
  config: Pick<RepoConfig, "ghPath">,
  text: string,
  sort: RepoSort,
): Promise<RepoChoice[]> {
  const typed = parseTypedRepo(text);
  const [data, exact] = await Promise.all([
    graphql<SearchResponse>(config, SEARCH_QUERY, { searchText: searchText(text, sort) }),
    typed
      ? graphql<{ repository: RawRepo | null }>(config, REPO_QUERY, { owner: typed.owner, name: typed.name })
          .then((result) => result.repository)
          .catch(() => null)
      : null,
  ]);
  return parseSearch(data, exact);
}

export function obviousChoice(choices: RepoChoice[]): RepoChoice | undefined {
  const { yours, withQueue } = groupChoices(choices);
  if (yours.length > 0) {
    return yours.length === 1 ? yours[0] : undefined;
  }
  return withQueue.length === 1 ? withQueue[0] : undefined;
}

export function sameRepo(a: RepoSelection | undefined, b: RepoSelection | undefined): boolean {
  return Boolean(a && b && `${a.owner}/${a.name}`.toLowerCase() === `${b.owner}/${b.name}`.toLowerCase());
}

export function selectionKey(selection: RepoSelection): string {
  return `${selection.owner}/${selection.name}${selection.branch ? `:${selection.branch}` : ""}`;
}

export function rememberRecent(recents: RepoSelection[], selection: RepoSelection, max = 6): RepoSelection[] {
  return [selection, ...recents.filter((recent) => !sameRepo(recent, selection))].slice(0, max);
}

export function switchTargets(
  current: RepoSelection,
  recents: RepoSelection[],
  choices: RepoChoice[],
  max = 8,
): RepoSelection[] {
  const { yours, withQueue } = groupChoices(choices);
  const candidates = [
    current,
    ...recents,
    ...[...yours, ...withQueue].map((choice) => ({
      owner: choice.owner,
      name: choice.name,
      branch: choice.queueBranch,
    })),
  ];
  return candidates
    .filter((candidate, index) => candidates.findIndex((other) => sameRepo(other, candidate)) === index)
    .slice(0, max);
}
