import { SymbolKind } from "../gql/operations";

// https://sourcegraph.com/github.com/sourcegraph/sourcegraph/-/blob/client/common/src/errors/types.ts?L3&subtree=true
export interface ErrorLike {
  message: string;
  name?: string;
}

// Copied from https://sourcegraph.com/github.com/sourcegraph/sourcegraph/-/blob/client/shared/src/search/stream.ts?L12&subtree=true

// The latest supported version of our search syntax. Users should never be able to determine the search version.
// The version is set based on the release tag of the instance.
// History:
// V3 - default to standard interpretation (RFC 675): Interpret patterns enclosed by /.../ as regular expressions. Interpret patterns literally otherwise.
// V2 - default to interpreting patterns literally only.
// V1 - default to interpreting patterns as regular expressions.
// None - Anything before 3.9.0 will not pass a version parameter and defaults to V1.
export const LATEST_VERSION = "V3";

/** All values that are valid for the `type:` filter. `null` represents default code search. */
export type SearchType = "file" | "repo" | "path" | "symbol" | "diff" | "commit" | null;

export type SearchEvent =
  | { type: "matches"; data: SearchMatch[] }
  | { type: "progress"; data: Progress }
  | { type: "filters"; data: Filter[] }
  | { type: "alert"; data: Alert }
  | { type: "error"; data: ErrorLike }
  | { type: "done"; data: Record<string, never> };

export type SearchMatch = ContentMatch | RepositoryMatch | CommitMatch | SymbolMatch | PathMatch | OwnerMatch;

export interface PathMatch {
  type: "path";
  path: string;
  pathMatches?: Range[];
  repository: string;
  repoStars?: number;
  repoLastFetched?: string;
  branches?: string[];
  commit?: string;
  language?: string;
  debug?: string;
}

export interface ContentMatch {
  type: "content";
  path: string;
  pathMatches?: Range[];
  repository: string;
  repoStars?: number;
  repoLastFetched?: string;
  branches?: string[];
  commit?: string;
  lineMatches?: LineMatch[];
  chunkMatches?: ChunkMatch[];
  hunks?: DecoratedHunk[];
  language?: string;
  debug?: string;
}

export interface DecoratedHunk {
  content: DecoratedContent;
  lineStart: number;
  lineCount: number;
  matches: Range[];
}

export interface DecoratedContent {
  plaintext?: string;
  html?: string;
}

export interface Range {
  start: Location;
  end: Location;
}

export interface Location {
  offset: number;
  line: number;
  column: number;
}

export interface LineMatch {
  line: string;
  lineNumber: number;
  offsetAndLengths: number[][];
}

export interface ChunkMatch {
  content: string;
  contentStart: Location;
  ranges: Range[];

  /**
   * Indicates that content has been truncated.
   *
   * This can only be true when maxLineLength search option is non-zero.
   */
  contentTruncated?: boolean;
}

export interface SymbolMatch {
  type: "symbol";
  path: string;
  repository: string;
  repoStars?: number;
  repoLastFetched?: string;
  branches?: string[];
  commit?: string;
  symbols: MatchedSymbol[];
  language?: string;
  debug?: string;
}

export interface MatchedSymbol {
  url: string;
  name: string;
  containerName: string;
  kind: SymbolKind;
  line: number;
}

type MarkdownText = string;

/**
 * Our batch based client requests generic fields from GraphQL to represent repo and commit/diff matches.
 * We currently are only using it for commit. To simplify the PoC we are keeping this interface for commits.
 * @see GQL.IGenericSearchResultInterface
 */
export interface CommitMatch {
  type: "commit";
  url: string;
  repository: string;
  oid: string;
  message: string;
  authorName: string;
  authorDate: string;
  committerName: string;
  committerDate: string;
  repoStars?: number;
  repoLastFetched?: string;

  content: MarkdownText;
  // Array of [line, character, length] triplets
  ranges: number[][];
}

export interface RepositoryMatch {
  type: "repo";
  repository: string;
  repositoryMatches?: Range[];
  repoStars?: number;
  repoLastFetched?: string;
  description?: string;
  fork?: boolean;
  archived?: boolean;
  private?: boolean;
  branches?: string[];
  descriptionMatches?: Range[];
  metadata?: Record<string, string | undefined>;
  topics?: string[];
}

export type OwnerMatch = PersonMatch | TeamMatch;

export interface BaseOwnerMatch {
  handle?: string;
  email?: string;
}

export interface PersonMatch extends BaseOwnerMatch {
  type: "person";
  handle?: string;
  email?: string;
  user?: {
    username: string;
    displayName?: string;
    avatarURL?: string;
  };
}

export interface TeamMatch extends BaseOwnerMatch {
  type: "team";
  name: string;
  displayName?: string;
  handle?: string;
  email?: string;
}

/**
 * An aggregate type representing a progress update.
 * Should be replaced when a new ones come in.
 */
export interface Progress {
  // No more progress to be tracked
  done?: boolean;
  /**
   * The number of repositories matching the repo: filter. Is set once they
   * are resolved.
   */
  repositoriesCount?: number;

  // The number of non-overlapping matches. If skipped is non-empty, then
  // this is a lower bound.
  matchCount: number;

  // Wall clock time in milliseconds for this search.
  durationMs: number;

  /**
   * A description of shards or documents that were skipped. This has a
   * deterministic ordering. More important reasons will be listed first. If
   * a search is repeated, the final skipped list will be the same.
   * However, within a search stream when a new skipped reason is found, it
   * may appear anywhere in the list.
   */
  skipped: Skipped[];

  // The URL of the trace for this query, if it exists.
  trace?: string;
}

export interface Skipped {
  /**
   * Why a document/shard/repository was skipped. We group counts by reason.
   *
   * - document-match-limit :: we found too many matches in a document, so we stopped searching it.
   * - shard-match-limit :: we found too many matches in a shard/repository, so we stopped searching it.
   * - repository-limit :: we did not search a repository because the set of repositories to search was too large.
   * - shard-timeout :: we ran out of time before searching a shard/repository.
   * - repository-cloning :: we could not search a repository because it is not cloned.
   * - repository-missing :: we could not search a repository because it is not cloned and we failed to find it on the remote code host.
   * - backend-missing :: we may be missing results due to a backend being transiently down.
   * - repository-fork :: we did not search a repository because it is a fork.
   * - excluded-archive :: we did not search a repository because it is archived.
   * - display :: we hit the display limit, so we stopped sending results from the backend.
   */
  reason:
    | "document-match-limit"
    | "shard-match-limit"
    | "repository-limit"
    | "shard-timedout"
    | "repository-cloning"
    | "repository-missing"
    | "repository-fork"
    | "backend-missing"
    | "excluded-archive"
    | "display"
    | "error";
  /**
   * A short message. eg 1,200 timed out.
   */
  title: string;
  /**
   * A message to show the user. Usually includes information explaining the reason,
   * count as well as a sample of the missing items.
   */
  message: string;
  severity: "info" | "warn" | "error";
  /**
   * a suggested query expression to remedy the skip. eg "archived:yes" or "timeout:2m".
   */
  suggested?: {
    title: string;
    queryExpression: string;
  };
}

export interface Filter {
  value: string;
  label: string;
  count: number;
  exhaustive: boolean;
  kind: "file" | "repo" | "lang" | "utility" | "author" | "commit date" | "symbol type" | "type";
}

export const TELEMETRY_FILTER_TYPES = {
  file: 1,
  repo: 2,
  lang: 3,
  utility: 4,
  author: 5,
  "commit date": 6,
  "symbol type": 7,
  type: 8,
  snippet: 9,
  count: 10,
};

export type SmartSearchAlertKind = "smart-search-additional-results" | "smart-search-pure-results";
export type AlertKind = SmartSearchAlertKind | "unowned-results";

export interface Alert {
  title: string;
  description?: string | null;
  kind?: AlertKind | null;
  proposedQueries: ProposedQuery[] | null;
}

// Same key values from internal/search/alert.go
export type AnnotationName = "ResultCount";

export interface ProposedQuery {
  description?: string | null;
  annotations?: { name: AnnotationName; value: string }[];
  query: string;
}

export type StreamingResultsState = "loading" | "error" | "complete";

interface BaseAggregateResults {
  state: StreamingResultsState;
  results: SearchMatch[];
  alert?: Alert;
  filters: Filter[];
  progress: Progress;
}

interface SuccessfulAggregateResults extends BaseAggregateResults {
  state: "loading" | "complete";
}

interface ErrorAggregateResults extends BaseAggregateResults {
  state: "error";
  error: Error;
}

export type AggregateStreamingSearchResults = SuccessfulAggregateResults | ErrorAggregateResults;

export const emptyAggregateResults: AggregateStreamingSearchResults = {
  state: "loading",
  results: [],
  filters: [],
  progress: {
    durationMs: 0,
    matchCount: 0,
    skipped: [],
  },
};

// Copied from the end of https://sourcegraph.com/github.com/sourcegraph/sourcegraph/-/blob/client/shared/src/search/stream.ts?L12&subtree=true

export function getRepositoryUrl(repository: string, branches?: string[]): string {
  const branch = branches?.[0];
  const revision = branch ? `@${branch}` : "";
  const label = repository + revision;
  return "/" + encodeURI(label);
}

export function getRevision(branches?: string[], version?: string): string {
  let revision = "";
  if (branches) {
    const branch = branches[0];
    if (branch !== "") {
      revision = branch;
    }
  } else if (version) {
    revision = version;
  }

  return revision;
}

export function getFileMatchUrl(fileMatch: ContentMatch | SymbolMatch | PathMatch): string {
  const revision = getRevision(fileMatch.branches, fileMatch.commit);
  return `/${fileMatch.repository}${revision ? "@" + revision : ""}/-/blob/${fileMatch.path}`;
}

export function getRepoMatchLabel(repoMatch: RepositoryMatch): string {
  const branch = repoMatch?.branches?.[0];
  const revision = branch ? `@${branch}` : "";
  return repoMatch.repository + revision;
}

export function getRepoMatchUrl(repoMatch: RepositoryMatch): string {
  const label = getRepoMatchLabel(repoMatch);
  return "/" + encodeURI(label);
}

export function getCommitMatchUrl(commitMatch: CommitMatch): string {
  return "/" + encodeURI(commitMatch.repository) + "/-/commit/" + commitMatch.oid;
}

export function getOwnerMatchUrl(ownerMatch: OwnerMatch, ignoreUnknownPerson = false): string {
  if (ownerMatch.type === "person" && ownerMatch.user) {
    return "/users/" + encodeURI(ownerMatch.user.username);
  }
  if (ownerMatch.type === "team") {
    return "/teams/" + encodeURI(ownerMatch.name);
  }
  if (ownerMatch.email) {
    return `mailto:${ownerMatch.email}`;
  }

  if (ignoreUnknownPerson) {
    return "";
  }
  // Unknown person with only a handle.
  // We can't ignore this person and return an empty string, we
  // need some unique dummy data here because this is used
  // as the key in the virtual list. We can't use the index.
  // In the future we may be able to link to the
  // person's profile page in the external code host.
  return "/unknown-person/" + encodeURI(ownerMatch.handle || "unknown");
}

export function getMatchUrl(match: SearchMatch): string {
  switch (match.type) {
    case "path":
    case "content":
    case "symbol": {
      return getFileMatchUrl(match);
    }
    case "commit": {
      return getCommitMatchUrl(match);
    }
    case "repo": {
      return getRepoMatchUrl(match);
    }
    case "person":
    case "team": {
      return getOwnerMatchUrl(match);
    }
  }
}

export type SearchMatchOfType<T extends SearchMatch["type"]> = Extract<SearchMatch, { type: T }>;

export function isSearchMatchOfType<T extends SearchMatch["type"]>(
  type: T,
): (match: SearchMatch) => match is SearchMatchOfType<T> {
  return (match): match is SearchMatchOfType<T> => match.type === type;
}
