import { buildKeywordGroup, parseDeltaDate } from "../lib/cli";
import { listThreads, searchThreads } from "../lib/delta";
import { getThreadDeeplink, getThreadTitle, sortThreadsNewestFirst } from "../lib/threads";

type Input = {
  /**
   * Topic words to look for in thread titles, summaries, keywords and messages: a project,
   * feature, error message or file name, in the language the threads are written in (the user
   * writes in English and Russian). A thread matches when it mentions any of the words, so pass
   * 1 to 4 distinctive words rather than a whole sentence. Leave empty to list the most recent
   * threads, for example for "what did I work on lately".
   */
  query?: string;
  /**
   * Only return threads created on or after this moment, as an ISO 8601 date or date-time such
   * as "2026-11-09". Use it for questions about a period like "this week" or "since Monday".
   */
  createdAfter?: string;
  /** Also return archived threads. Defaults to false; set it when the user asks about old or archived work. */
  includeArchived?: boolean;
  /** Maximum number of threads to return, from 1 to 25. Defaults to 10. */
  limit?: number;
};

/**
 * Finds the user's Delta threads (conversations with coding agents) by topic, or lists the most
 * recent ones, newest first when no query is given. Returns each thread's ID, title, summary,
 * keywords, creation time and a link. Summaries are short; call `read-thread` with an ID for
 * what was actually said and done.
 */
export default async function findThreads(input: Input) {
  const limit = Math.min(Math.max(Math.round(input.limit ?? 10), 1), 25);
  const keywords = input.query ? buildKeywordGroup(input.query) : undefined;
  const createdAfter = input.createdAfter ? new Date(input.createdAfter) : undefined;
  if (createdAfter && Number.isNaN(createdAfter.getTime())) {
    throw new Error(`createdAfter must be an ISO 8601 date such as 2026-11-09, not "${input.createdAfter}"`);
  }

  // Filters apply after the search, so ask Delta for more matches than the limit.
  const candidates = keywords ? await searchThreads(keywords, limit * 4) : sortThreadsNewestFirst(await listThreads());

  const threads = candidates
    .map((thread) => ({ thread, createdAt: parseDeltaDate(thread.created_at_utc) }))
    .filter(({ thread }) => input.includeArchived || !thread.archived)
    .filter(({ createdAt }) => !createdAfter || (createdAt !== undefined && createdAt >= createdAfter))
    .slice(0, limit)
    .map(({ thread, createdAt }) => ({
      id: thread.id,
      title: getThreadTitle(thread),
      generatedTitle: thread.generated_title ?? undefined,
      summary: thread.summary ?? undefined,
      keywords: thread.keywords,
      createdAt: createdAt?.toISOString(),
      archived: thread.archived,
      link: getThreadDeeplink(thread),
    }));

  return {
    threads,
    note:
      input.query && !keywords
        ? "The query had no distinctive words, so these are the most recent threads instead of matches."
        : threads.length === 0
          ? "No threads matched. Try fewer or different words, another language, or includeArchived."
          : undefined,
  };
}
