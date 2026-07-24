import { environment } from "@raycast/api";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import {
  type CodexThread,
  type CodexThreadConversation,
  type CodexThreadConversationMessage,
  readThreadConversations,
} from "./codex-app-server";
import { cleanCodexUserMessage } from "./codex-message-cleaning";
import {
  getProjectName,
  getThreadDisplayTitle,
  tildeifyPath,
  truncate,
} from "./format";

const SEARCH_INDEX_VERSION = 1;
const SEARCH_INDEX_DIRECTORY = join(
  environment.supportPath,
  "codex-thread-search",
);
const GENERIC_THREAD_PATH_SEGMENTS = new Set([
  "",
  "~",
  "users",
  basename(homedir()).toLowerCase(),
  "projects",
]);
const SNIPPET_CONTEXT_CHARACTERS = 90;
const SNIPPET_MAX_CHARACTERS = 220;

export type CodexThreadSearchMatchField =
  | "title"
  | "path"
  | "preview"
  | "transcript";

export type CodexThreadSearchMatch = {
  field: CodexThreadSearchMatchField;
  snippet: string | null;
};

export type CodexThreadSearchResult = {
  thread: CodexThread;
  match: CodexThreadSearchMatch | null;
  score: number;
};

export type CodexThreadSearchRecord = {
  threadId: string;
  fingerprint: string;
  transcriptText: string;
  normalizedTranscriptText: string;
};

type StoredCodexThreadSearchRecord = {
  version: number;
  threadId: string;
  fingerprint: string;
  transcriptText: string;
};

type ScoredFieldMatch = {
  field: CodexThreadSearchMatchField;
  score: number;
  snippetSource?: string;
};

export async function loadCachedThreadSearchRecords(
  threads: CodexThread[],
): Promise<CodexThreadSearchRecord[]> {
  await ensureSearchIndexDirectory();

  const records = await Promise.all(
    threads.map((thread) => readFreshThreadSearchRecord(thread)),
  );
  return records.filter((record): record is CodexThreadSearchRecord =>
    Boolean(record),
  );
}

export async function indexMissingThreadSearchRecords(
  threads: CodexThread[],
  existingRecords: Map<string, CodexThreadSearchRecord>,
): Promise<CodexThreadSearchRecord[]> {
  await ensureSearchIndexDirectory();

  const threadsToIndex = threads.filter(
    (thread) => !existingRecords.has(thread.id),
  );
  if (threadsToIndex.length === 0) {
    return [];
  }

  const threadsById = new Map(
    threadsToIndex.map((thread) => [thread.id, thread]),
  );
  const results = await readThreadConversations(
    threadsToIndex.map((thread) => thread.id),
  );
  const records: CodexThreadSearchRecord[] = [];

  for (const result of results) {
    if (result.status !== "success") {
      continue;
    }

    const thread = threadsById.get(result.threadId);
    if (!thread) {
      continue;
    }

    records.push(buildThreadSearchRecord(thread, result.conversation));
  }

  await Promise.all(records.map((record) => writeThreadSearchRecord(record)));

  return records;
}

export function searchCodexThreads(
  threads: CodexThread[],
  recordsByThreadId: Map<string, CodexThreadSearchRecord>,
  searchText: string,
): CodexThreadSearchResult[] {
  const normalizedQuery = normalizeSearchText(searchText);
  if (!normalizedQuery) {
    return threads.map((thread) => ({
      thread,
      match: null,
      score: thread.updatedAt,
    }));
  }

  const queryTokens = getSearchTokens(normalizedQuery);
  const results: CodexThreadSearchResult[] = [];

  for (const thread of threads) {
    const metadataMatch = findBestMetadataMatch(
      thread,
      normalizedQuery,
      queryTokens,
    );
    const transcriptMatch = findTranscriptMatch(
      recordsByThreadId.get(thread.id),
      normalizedQuery,
      queryTokens,
    );
    const bestMatch = getBestMatch(metadataMatch, transcriptMatch);

    if (!bestMatch) {
      continue;
    }

    results.push({
      thread,
      match: {
        field: bestMatch.field,
        snippet: bestMatch.snippetSource
          ? buildSnippet(bestMatch.snippetSource, queryTokens)
          : null,
      },
      score: bestMatch.score,
    });
  }

  return results.sort(
    (left, right) =>
      right.score - left.score ||
      right.thread.updatedAt - left.thread.updatedAt,
  );
}

function getThreadSearchIndexFingerprint(thread: CodexThread): string {
  return [
    SEARCH_INDEX_VERSION,
    thread.id,
    thread.updatedAt,
    thread.name ?? "",
    thread.cwd,
    thread.preview,
  ].join("\u0000");
}

function findBestMetadataMatch(
  thread: CodexThread,
  normalizedQuery: string,
  queryTokens: string[],
): ScoredFieldMatch | null {
  const searchableTitle = getSearchableThreadTitle(thread);
  const pathKeywords = getThreadPathKeywords(thread.cwd);
  const preview = normalizePreview(thread.preview);
  const fields: ScoredFieldMatch[] = [
    {
      field: "title",
      score: scoreSearchField(
        searchableTitle,
        normalizedQuery,
        queryTokens,
        1_000,
      ),
    },
    {
      field: "path",
      score: scoreSearchField(
        pathKeywords.join(" "),
        normalizedQuery,
        queryTokens,
        850,
      ),
    },
    {
      field: "preview",
      score: scoreSearchField(preview, normalizedQuery, queryTokens, 650),
      snippetSource: preview,
    },
  ];

  return (
    fields
      .filter((match) => match.score > 0)
      .sort((left, right) => right.score - left.score)[0] ?? null
  );
}

function getSearchableThreadTitle(thread: CodexThread): string {
  const title = getThreadDisplayTitle(thread);
  return title === thread.id ? "" : title;
}

function findTranscriptMatch(
  record: CodexThreadSearchRecord | undefined,
  normalizedQuery: string,
  queryTokens: string[],
): ScoredFieldMatch | null {
  if (!record) {
    return null;
  }

  const score = scoreNormalizedSearchField(
    record.normalizedTranscriptText,
    normalizedQuery,
    queryTokens,
    450,
  );
  if (score === 0) {
    return null;
  }

  return {
    field: "transcript",
    score,
    snippetSource: record.transcriptText,
  };
}

function getBestMatch(
  left: ScoredFieldMatch | null,
  right: ScoredFieldMatch | null,
): ScoredFieldMatch | null {
  if (!left) return right;
  if (!right) return left;
  return left.score >= right.score ? left : right;
}

function scoreSearchField(
  text: string | null | undefined,
  normalizedQuery: string,
  queryTokens: string[],
  baseScore: number,
) {
  return scoreNormalizedSearchField(
    normalizeSearchText(text ?? ""),
    normalizedQuery,
    queryTokens,
    baseScore,
  );
}

function scoreNormalizedSearchField(
  normalizedText: string,
  normalizedQuery: string,
  queryTokens: string[],
  baseScore: number,
): number {
  if (!normalizedText) {
    return 0;
  }

  if (normalizedText.includes(normalizedQuery)) {
    return baseScore;
  }

  if (
    queryTokens.length > 1 &&
    queryTokens.every((token) => normalizedText.includes(token))
  ) {
    return baseScore - 75;
  }

  return 0;
}

function buildThreadSearchRecord(
  thread: CodexThread,
  conversation: CodexThreadConversation,
): CodexThreadSearchRecord {
  const transcriptText = buildTranscriptSearchText(conversation.messages);

  return {
    threadId: thread.id,
    fingerprint: getThreadSearchIndexFingerprint(thread),
    transcriptText,
    normalizedTranscriptText: normalizeSearchText(transcriptText),
  };
}

function buildTranscriptSearchText(
  messages: CodexThreadConversationMessage[],
): string {
  return messages
    .map((message) =>
      message.role === "user"
        ? cleanCodexUserMessage(message.text, "compact")
        : message.text.trim(),
    )
    .filter(Boolean)
    .join("\n\n");
}

function getThreadPathKeywords(cwd: string): string[] {
  const segments = tildeifyPath(cwd)
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter(
      (segment) => !GENERIC_THREAD_PATH_SEGMENTS.has(segment.toLowerCase()),
    );

  return Array.from(
    new Set([getProjectName(cwd), ...segments].filter(Boolean)),
  );
}

function normalizePreview(preview: string): string {
  return preview.replace(/\s+/g, " ").trim();
}

function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function getSearchTokens(normalizedQuery: string): string[] {
  return normalizedQuery.split(" ").filter(Boolean);
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
  const start = Math.max(0, matchIndex - SNIPPET_CONTEXT_CHARACTERS);
  const end = Math.min(
    sourceText.length,
    matchIndex + matchedToken.length + SNIPPET_CONTEXT_CHARACTERS,
  );
  const prefix = start > 0 ? "..." : "";
  const suffix = end < sourceText.length ? "..." : "";

  return truncate(
    `${prefix}${sourceText.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`,
    SNIPPET_MAX_CHARACTERS,
  );
}

async function readFreshThreadSearchRecord(
  thread: CodexThread,
): Promise<CodexThreadSearchRecord | null> {
  let raw: string;

  try {
    raw = await readFile(getThreadSearchRecordPath(thread.id), "utf8");
  } catch {
    return null;
  }

  let storedRecord: StoredCodexThreadSearchRecord;
  try {
    storedRecord = JSON.parse(raw) as StoredCodexThreadSearchRecord;
  } catch {
    return null;
  }

  if (
    storedRecord.version !== SEARCH_INDEX_VERSION ||
    storedRecord.threadId !== thread.id ||
    storedRecord.fingerprint !== getThreadSearchIndexFingerprint(thread)
  ) {
    return null;
  }

  return {
    threadId: storedRecord.threadId,
    fingerprint: storedRecord.fingerprint,
    transcriptText: storedRecord.transcriptText,
    normalizedTranscriptText: normalizeSearchText(storedRecord.transcriptText),
  };
}

async function writeThreadSearchRecord(
  record: CodexThreadSearchRecord,
): Promise<void> {
  const storedRecord: StoredCodexThreadSearchRecord = {
    version: SEARCH_INDEX_VERSION,
    threadId: record.threadId,
    fingerprint: record.fingerprint,
    transcriptText: record.transcriptText,
  };
  const path = getThreadSearchRecordPath(record.threadId);
  const temporaryPath = `${path}.${process.pid}.tmp`;

  await writeFile(temporaryPath, JSON.stringify(storedRecord), "utf8");
  await rename(temporaryPath, path);
}

let searchIndexDirectoryPromise: Promise<void> | undefined;
async function ensureSearchIndexDirectory(): Promise<void> {
  if (!searchIndexDirectoryPromise) {
    searchIndexDirectoryPromise = mkdir(SEARCH_INDEX_DIRECTORY, {
      recursive: true,
    })
      .then(() => undefined)
      .catch((error) => {
        searchIndexDirectoryPromise = undefined;
        throw error;
      });
  }
  return searchIndexDirectoryPromise;
}

function getThreadSearchRecordPath(threadId: string): string {
  return join(
    SEARCH_INDEX_DIRECTORY,
    `${threadId.replace(/[^a-zA-Z0-9-]/g, "")}.json`,
  );
}
