import { pondClient } from "../api";
import { parseCursor, parseSavedSince } from "../api/client";

type Input = {
  /** Search terms. Omit to list the most recently saved items. */
  keywords?: string;
  /** Optional source: twitter, instagram, pinterest, arena, cosmos, tiktok, youtube, reddit, threads, web, or local. */
  source?: string;
  /** Match an exact tag in addition to the keywords and source. */
  tag?: string;
  /** Include saves on or after this ISO date or timestamp, for example 2026-10-01 or 2026-10-01T09:00:00+05:30. Dates without times use UTC. */
  savedSince?: string;
  /** The nextCursor returned by a previous search. Keep keywords and source unchanged when using it. */
  cursor?: string;
};

export default async function SearchLibrary(input: Input) {
  const page = await pondClient().search({
    ...input,
    savedSince: parseSavedSince(input.savedSince),
    cursor: parseCursor(input.cursor),
  });
  return { ...page, nextCursor: page.nextCursor ? JSON.stringify(page.nextCursor) : null };
}
