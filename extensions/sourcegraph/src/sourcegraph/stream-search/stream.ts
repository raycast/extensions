// Copied from https://sourcegraph.com/github.com/sourcegraph/sourcegraph/-/blob/client/shared/src/search/stream.ts?L12&subtree=true

import { AggregableBadge } from "sourcegraph";

// https://sourcegraph.com/github.com/sourcegraph/sourcegraph/-/blob/cmd/frontend/graphqlbackend/schema.graphql?L3323&subtree=true
export type SymbolKind = string;

// https://sourcegraph.com/github.com/sourcegraph/sourcegraph/-/blob/client/common/src/errors/types.ts?L3&subtree=true
export interface ErrorLike {
  message: string;
  name?: string;
}

export type SearchEvent =
  | { type: "matches"; data: SearchMatch[] }
  | { type: "progress"; data: Progress }
  | { type: "filters"; data: Filter[] }
  | { type: "alert"; data: Alert }
  | { type: "error"; data: ErrorLike }
  | { type: "done"; data: Record<string, never> };

export type SearchMatch = ContentMatch | RepositoryMatch | CommitMatch | SymbolMatch | PathMatch;

export interface PathMatch {
  type: "path";
  path: string;
  repository: string;
  repoStars?: number;
  repoLastFetched?: string;
  branches?: string[];
  commit?: string;
}

export interface ContentMatch {
  type: "content";
  path: string;
  repository: string;
  repoStars?: number;
  repoLastFetched?: string;
  branches?: string[];
  commit?: string;
  lineMatches: LineMatch[];
  hunks?: DecoratedHunk[];
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

interface LineMatch {
  line: string;
  lineNumber: number;
  offsetAndLengths: number[][];
  aggregableBadges?: AggregableBadge[];
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
}

export interface MatchedSymbol {
  url: string;
  name: string;
  containerName: string;
  kind: SymbolKind;
}

type MarkdownText = string;

/**
 * Our batch based client requests generic fields from GraphQL to represent repo and commit/diff matches.
 * We currently are only using it for commit. To simplify the PoC we are keeping this interface for commits.
 *
 * @see GQL.IGenericSearchResultInterface
 */
export interface CommitMatch {
  type: "commit";
  label: MarkdownText;
  url: string;
  detail: MarkdownText;
  repository: string;
  repoStars?: number;
  repoLastFetched?: string;

  content: MarkdownText;
  ranges: number[][];
}

export interface RepositoryMatch {
  type: "repo";
  repository: string;
  repoStars?: number;
  repoLastFetched?: string;
  description?: string;
  fork?: boolean;
  archived?: boolean;
  private?: boolean;
  branches?: string[];
}

/**
 * An aggregate type representing a progress update.
 * Should be replaced when a new ones come in.
 */
export interface Progress {
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
   * - excluded-fork :: we did not search a repository because it is a fork.
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
    | "excluded-fork"
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
  limitHit: boolean;
  kind: string;
}

interface Alert {
  title: string;
  description?: string | null;
  proposedQueries: ProposedQuery[] | null;
}

interface ProposedQuery {
  description?: string | null;
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

export function getMatchUrl(match: SearchMatch): string {
  switch (match.type) {
    case "path":
    case "content":
    case "symbol":
      return getFileMatchUrl(match);
    case "commit":
      return match.url;
    case "repo":
      return getRepoMatchUrl(match);
  }
}
