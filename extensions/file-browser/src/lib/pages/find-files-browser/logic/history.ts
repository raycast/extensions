import type { ArtifactHistoryEntry, FindFilesSearchArtifact, QueryHistoryEntry, RawHistoryEntry } from "./types";
import { normalizeQuery } from "./query-normalization";

export const QUERY_HISTORY_KEY = "ai-spotlight-search-history";
export const QUERY_HISTORY_LIMIT = 30;

/**
 * Migrate a legacy history entry to an ArtifactHistoryEntry.
 * Returns null for entries that cannot be safely mapped
 * (plain strings, entries without predicate/scope data).
 */
export function migrateLegacyEntry(raw: RawHistoryEntry): ArtifactHistoryEntry | null {
  if (typeof raw === "string") {
    return null;
  }

  if ("artifact" in raw && typeof raw.artifact === "object" && raw.artifact !== null) {
    return raw;
  }

  return null;
}

/**
 * Normalize raw history entries into artifact-based entries.
 * Legacy entries that cannot be migrated are dropped.
 */
export function normalizeArtifactHistoryEntries(entries: RawHistoryEntry[]): ArtifactHistoryEntry[] {
  return entries
    .map((entry) => migrateLegacyEntry(entry))
    .filter((entry): entry is ArtifactHistoryEntry => entry !== null);
}

function matchesArtifact(a: FindFilesSearchArtifact, naturalQuery: string): boolean {
  return normalizeQuery(a.naturalQuery) === normalizeQuery(naturalQuery);
}

function matchesQuery(entryQuery: string, normalizedQuery: string): boolean {
  return normalizeQuery(entryQuery) === normalizedQuery;
}

export function mergeArtifactHistoryEntry(
  entries: ArtifactHistoryEntry[],
  artifact: FindFilesSearchArtifact,
): ArtifactHistoryEntry[] {
  const now = Date.now();

  const existing = entries.find((e) => matchesArtifact(e.artifact, artifact.naturalQuery));
  const filtered = entries.filter((e) => !matchesArtifact(e.artifact, artifact.naturalQuery));

  const mergedArtifact: FindFilesSearchArtifact = {
    ...artifact,
    scopePath: artifact.scopePath || existing?.artifact.scopePath || "",
    updatedAt: now,
    createdAt: existing?.artifact.createdAt ?? now,
  };

  const newEntry: ArtifactHistoryEntry = {
    timestamp: now,
    artifact: mergedArtifact,
  };

  return [newEntry, ...filtered].slice(0, QUERY_HISTORY_LIMIT);
}

/** @deprecated Use mergeArtifactHistoryEntry instead */
export function mergeHistoryEntry(entries: QueryHistoryEntry[], query: string, onlyIn?: string): QueryHistoryEntry[] {
  const normalizedQuery = normalizeQuery(query);
  const now = Date.now();

  const existing = entries.find((e) => matchesQuery(e.query, normalizedQuery));

  const filtered = entries.filter((e) => !matchesQuery(e.query, normalizedQuery));

  const preservedOnlyIn = onlyIn ?? existing?.onlyIn;

  const newEntry: QueryHistoryEntry = {
    query: normalizedQuery,
    timestamp: now,
    onlyIn: preservedOnlyIn,
  };

  return [newEntry, ...filtered].slice(0, QUERY_HISTORY_LIMIT);
}

/** @deprecated Use mergeArtifactHistoryEntry instead */
export const upsertHistoryEntry = mergeHistoryEntry;

export function deleteArtifactHistoryEntry(
  entries: ArtifactHistoryEntry[],
  naturalQuery: string,
): ArtifactHistoryEntry[] {
  return entries.filter((e) => !matchesArtifact(e.artifact, naturalQuery));
}

/** @deprecated Use normalizeArtifactHistoryEntries instead */
export function normalizeHistoryEntries(entries: RawHistoryEntry[]): QueryHistoryEntry[] {
  return entries
    .map((entry) => {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (!trimmed) return null;
        return { query: trimmed, timestamp: Date.now() };
      }
      if ("query" in entry) {
        const trimmed = entry.query.trim();
        if (!trimmed) return null;
        return { query: trimmed, timestamp: entry.timestamp, onlyIn: entry.onlyIn };
      }
      return null;
    })
    .filter((e): e is QueryHistoryEntry => e !== null);
}

/** @deprecated Use deleteArtifactHistoryEntry instead */
export function deleteHistoryEntry(entries: QueryHistoryEntry[], query: string): QueryHistoryEntry[] {
  const normalized = normalizeQuery(query);
  return entries.filter((e) => normalizeQuery(e.query) !== normalized);
}

export function clearHistory(entries: ArtifactHistoryEntry[]): ArtifactHistoryEntry[];
export function clearHistory(entries: QueryHistoryEntry[]): QueryHistoryEntry[];
export function clearHistory(
  entries: ArtifactHistoryEntry[] | QueryHistoryEntry[],
): ArtifactHistoryEntry[] | QueryHistoryEntry[] {
  void entries;
  return [];
}
