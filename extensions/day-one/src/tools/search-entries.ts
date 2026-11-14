import { logger } from "@chrismessina/raycast-logger";
import { listJournals, searchEntries } from "../lib/api";
import { ensureSearchModel } from "../lib/cli";
import { cleanBody, mentions } from "../lib/parse";
import { resolveJournal, toolEntry } from "../lib/tool-helpers";

const log = logger.child("[ai]");

/** Enough to count matches across a big journal, without pulling the whole thing into one answer. */
const COUNT_LIMIT = 500;

type Input = {
  /** What to look for, in plain words. Search matches meaning as well as exact words. Leave empty to list the newest entries that match the filters. */
  query?: string;
  /** Only search these journals, by name or ID. */
  journals?: string[];
  /** Only entries with all of these tags. */
  tags?: string[];
  /** Earliest entry date, as YYYY-MM-DD. */
  dateFrom?: string;
  /** Latest entry date, as YYYY-MM-DD. */
  dateTo?: string;
  /** Only starred entries. */
  starred?: boolean;
  /** How many entries to return in `results`, 1 to 50. Defaults to 10. The counts cover every match regardless. */
  limit?: number;
};

/**
 * Searches the user's Day One entries. Returns `matched` (how many entries matched, up to 500), `mentioning` (how
 * many of those contain the query as a whole word), and `results`: the best matches, each with its text cut at
 * 2,000 characters (use get-entry for the rest).
 */
export default async function tool(input: Input) {
  const query = input.query?.trim();
  const [journals] = await Promise.all([listJournals(), query ? ensureSearchModel() : undefined]);
  const journalIds = await Promise.all(
    (input.journals ?? []).map(async (name) => (await resolveJournal(name, journals)).id),
  );
  const hits = await searchEntries({
    query,
    journalIds,
    tags: input.tags,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    favorite: input.starred,
    limit: COUNT_LIMIT,
  });
  log.debug("search-entries", { queryChars: query?.length ?? 0, journals: journalIds.length, matched: hits.length });
  const byId = new Map(journals.map((j) => [j.id, j]));
  const limit = Math.min(Math.max(Math.round(input.limit ?? 10), 1), 50);
  return {
    matched: hits.length,
    matchedIsCapped: hits.length >= COUNT_LIMIT,
    mentioning: query ? hits.filter(({ entry }) => mentions(cleanBody(entry.body), query)).length : undefined,
    results: hits.slice(0, limit).map(({ entry, similarity }) => ({ ...toolEntry(entry, byId), similarity })),
  };
}
