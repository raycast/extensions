import type { EntryKind } from "./command-builders";

export interface BlockEntryInput {
  kind: EntryKind;
  entry: string;
}

/**
 * Parses newline-separated Cold Turkey website or exception entries.
 * Empty lines are ignored and exact duplicates are removed while preserving order.
 */
export function parseEntryLines(value: string): string[] {
  const entries: string[] = [];
  const seen = new Set<string>();

  for (const line of value.split(/\r?\n/)) {
    const entry = line.trim();
    if (!entry || seen.has(entry)) continue;
    seen.add(entry);
    entries.push(entry);
  }

  return entries;
}

export function initialBlockEntries(websitesText: string, exceptionsText: string): BlockEntryInput[] {
  return [
    ...parseEntryLines(websitesText).map((entry) => ({
      kind: "website" as const,
      entry,
    })),
    ...parseEntryLines(exceptionsText).map((entry) => ({
      kind: "exception" as const,
      entry,
    })),
  ];
}

export function summarizeEntryCounts(entries: BlockEntryInput[]): string {
  const websiteCount = entries.filter((entry) => entry.kind === "website").length;
  const exceptionCount = entries.length - websiteCount;
  const parts: string[] = [];

  if (websiteCount > 0) parts.push(`${websiteCount} ${pluralize("website", websiteCount)}`);
  if (exceptionCount > 0) parts.push(`${exceptionCount} ${pluralize("exception", exceptionCount)}`);

  return parts.join(" and ");
}

function pluralize(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}
