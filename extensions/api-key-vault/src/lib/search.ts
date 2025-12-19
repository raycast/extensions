import { VaultRecordMetadata } from "./model";

export type MatchKind = "key name" | "tag" | "application" | "service";

export interface MatchResult {
  record: VaultRecordMetadata;
  kinds: MatchKind[];
}

function includesCI(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function parseQueryTerms(query: string): { free: string[]; tags: string[] } {
  const rawTerms = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const tags: string[] = [];
  const free: string[] = [];

  for (const term of rawTerms) {
    if (term.startsWith("#") && term.length > 1) {
      tags.push(term.slice(1).toLowerCase());
      continue;
    }
    if (term.toLowerCase().startsWith("tag:") && term.length > 4) {
      tags.push(term.slice(4).toLowerCase());
      continue;
    }
    free.push(term);
  }

  return { free, tags };
}

function recordMatchesAllTerms(
  record: VaultRecordMetadata,
  query: string,
): MatchResult | undefined {
  const trimmed = query.trim();
  if (!trimmed) {
    return { record, kinds: [] };
  }

  const { free, tags } = parseQueryTerms(trimmed);
  const recordTags = record.tags.map((t) => t.toLowerCase());

  // tag terms are ANDed
  for (const tag of tags) {
    if (!recordTags.some((t) => t.includes(tag))) return undefined;
  }

  // free terms are ANDed, but each term can match any field
  for (const term of free) {
    const matches =
      includesCI(record.keyName, term) ||
      includesCI(record.application, term) ||
      includesCI(record.service, term) ||
      recordTags.some((t) => includesCI(t, term));

    if (!matches) return undefined;
  }

  const kinds = new Set<MatchKind>();
  if (includesCI(record.keyName, trimmed)) kinds.add("key name");
  if (includesCI(record.application, trimmed)) kinds.add("application");
  if (includesCI(record.service, trimmed)) kinds.add("service");
  if (
    recordTags.some(
      (t) =>
        includesCI(t, trimmed) ||
        (tags.length > 0 && tags.some((q) => t.includes(q))),
    )
  )
    kinds.add("tag");

  return { record, kinds: Array.from(kinds) };
}

export function findMatches(
  records: VaultRecordMetadata[],
  query: string,
): MatchResult[] {
  const results: MatchResult[] = [];
  for (const record of records) {
    const match = recordMatchesAllTerms(record, query);
    if (match) results.push(match);
  }

  results.sort((a, b) => a.record.keyName.localeCompare(b.record.keyName));
  return results;
}
