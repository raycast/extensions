import type { CodexThread, CodexThreadSearchHit } from "./app-server";
import {
  getProjectName,
  getThreadDisplayTitle,
  tildeifyPath,
  truncate,
} from "./format";

const snippetContextCharacters = 90;
const snippetMaxCharacters = 220;
const genericPathSegments = new Set(["", "~", "users", "projects"]);

export type CodexThreadSearchMatch = {
  snippet: string | null;
};

export type CodexThreadSearchResult = {
  thread: CodexThread;
  match: CodexThreadSearchMatch | null;
  score: number;
};

type ScoredMatch = {
  score: number;
  snippetSource?: string;
};

type ThreadSearchIndex = {
  title: string;
  pathKeywords: string;
  preview: string;
  previewSearch: string;
};

// Normalizing a thread's searchable text depends on the thread alone, not on
// the query, so derive it once instead of on every keystroke. Weak keys let an
// entry fall away with the thread it describes.
const threadSearchIndexes = new WeakMap<CodexThread, ThreadSearchIndex>();

export function mapTranscriptSearchResults(
  hits: CodexThreadSearchHit[],
): CodexThreadSearchResult[] {
  const seenThreadIds = new Set<string>();
  const results: CodexThreadSearchResult[] = [];

  for (const hit of hits) {
    if (seenThreadIds.has(hit.thread.id)) {
      continue;
    }

    seenThreadIds.add(hit.thread.id);
    results.push({
      thread: hit.thread,
      match: { snippet: normalizeSnippet(hit.snippet) },
      score: hit.thread.updatedAt,
    });
  }

  return results;
}

export function mergeThreadSearchResults(
  metadataResults: CodexThreadSearchResult[],
  nativeResults: CodexThreadSearchResult[],
): CodexThreadSearchResult[] {
  const matchedThreadIds = new Set(
    metadataResults.map(({ thread }) => thread.id),
  );

  return [
    ...metadataResults,
    ...nativeResults.filter(({ thread }) => !matchedThreadIds.has(thread.id)),
  ];
}

export function searchThreadMetadata(
  threads: CodexThread[],
  searchText: string,
): CodexThreadSearchResult[] {
  const query = normalizeSearchText(searchText);
  if (!query) {
    return threads.map((thread) => ({
      thread,
      match: null,
      score: thread.updatedAt,
    }));
  }

  const queryTokens = query.split(" ").filter(Boolean);
  const results: CodexThreadSearchResult[] = [];

  for (const thread of threads) {
    const match = findBestMetadataMatch(thread, query, queryTokens);
    if (!match) {
      continue;
    }

    results.push({
      thread,
      match: {
        snippet: match.snippetSource
          ? buildSnippet(match.snippetSource, queryTokens)
          : null,
      },
      score: match.score,
    });
  }

  return results.sort(
    (left, right) =>
      right.score - left.score ||
      right.thread.updatedAt - left.thread.updatedAt,
  );
}

function getThreadSearchIndex(thread: CodexThread): ThreadSearchIndex {
  const cached = threadSearchIndexes.get(thread);
  if (cached) {
    return cached;
  }

  const title = getThreadDisplayTitle(thread);
  const preview = normalizeSnippetText(thread.preview) ?? "";
  const index: ThreadSearchIndex = {
    title: normalizeSearchText(title === thread.id ? "" : title),
    pathKeywords: normalizeSearchText(getPathKeywords(thread.cwd).join(" ")),
    preview,
    previewSearch: normalizeSearchText(preview),
  };
  threadSearchIndexes.set(thread, index);

  return index;
}

function findBestMetadataMatch(
  thread: CodexThread,
  query: string,
  queryTokens: string[],
): ScoredMatch | null {
  const index = getThreadSearchIndex(thread);
  const matches: ScoredMatch[] = [
    {
      score: scoreSearchField(index.title, query, queryTokens, 1_000),
    },
    {
      score: scoreSearchField(index.pathKeywords, query, queryTokens, 850),
    },
    {
      score: scoreSearchField(index.previewSearch, query, queryTokens, 650),
      snippetSource: index.preview,
    },
  ];

  return (
    matches
      .filter((match) => match.score > 0)
      .sort((left, right) => right.score - left.score)[0] ?? null
  );
}

function scoreSearchField(
  normalizedText: string,
  query: string,
  queryTokens: string[],
  score: number,
): number {
  if (!normalizedText) {
    return 0;
  }

  if (normalizedText.includes(query)) {
    return score;
  }

  if (
    queryTokens.length > 1 &&
    queryTokens.every((token) => normalizedText.includes(token))
  ) {
    return score - 75;
  }

  return 0;
}

function getPathKeywords(cwd: string): string[] {
  const segments = tildeifyPath(cwd)
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter((segment) => !genericPathSegments.has(segment.toLowerCase()));

  return Array.from(
    new Set([getProjectName(cwd), ...segments].filter(Boolean)),
  );
}

function buildSnippet(
  sourceText: string,
  queryTokens: string[],
): string | null {
  const normalizedSourceText = sourceText.toLowerCase();
  const matchedToken = queryTokens.find((token) =>
    normalizedSourceText.includes(token),
  );
  if (!matchedToken) {
    return null;
  }

  const matchIndex = normalizedSourceText.indexOf(matchedToken);
  const start = Math.max(0, matchIndex - snippetContextCharacters);
  const end = Math.min(
    sourceText.length,
    matchIndex + matchedToken.length + snippetContextCharacters,
  );
  const prefix = start > 0 ? "…" : "";
  const suffix = end < sourceText.length ? "…" : "";

  return truncate(
    `${prefix}${sourceText.slice(start, end).trim()}${suffix}`,
    snippetMaxCharacters,
  );
}

function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeSnippet(snippet: string | null): string | null {
  const normalized = normalizeSnippetText(snippet);
  return normalized ? truncate(normalized, snippetMaxCharacters) : null;
}

function normalizeSnippetText(snippet: string | null): string | null {
  const normalized = snippet?.replace(/\s+/g, " ").trim();
  return normalized || null;
}
