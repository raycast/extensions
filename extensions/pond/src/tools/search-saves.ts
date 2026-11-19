import type { ApiLibraryQueryInput } from "pond-api";
import { pond } from "../api/client";
import { summarize } from "../api/summary";
import { clampLimit, decodeCursor, encodeCursor, parseSavedSince } from "../api/tool-input";

type Input = {
  /** Search terms. Omit to list the most recently saved items. */
  keywords?: string;
  /** Set true to rank by meaning instead of matching words. Needs keywords. Ignores tag, savedSince, untagged, inTrash and cursor. */
  byMeaning?: boolean;
  /** Source ID such as twitter, instagram, pinterest, arena, cosmos, tiktok, youtube, reddit, threads, web or local. Use twitter for X and arena for Are.na. */
  source?: string;
  /** Exact tag name, from List Tags. */
  tag?: string;
  /** Folder ID from List Folders. */
  folderId?: string;
  /** Save type: image, video, audio, document, font, file, link or text. */
  type?: string;
  /** Only saves on or after this ISO date or timestamp, for example 2026-10-01. Dates without times use UTC. */
  savedSince?: string;
  /** Set true to list saves without tags. */
  untagged?: boolean;
  /** Set true to search the Trash instead of the library. */
  inTrash?: boolean;
  /** Results per page, 1 to 50. Defaults to 20. */
  limit?: number;
  /** The nextCursor from a previous call. Keep every other input unchanged when passing it. */
  cursor?: string;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export default async function tool(input: Input) {
  const api = pond();
  const limit = clampLimit(input.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const keywords = input.keywords?.trim();

  if (input.byMeaning && keywords) {
    const result = await api.search({
      query: keywords,
      source: input.source,
      folderId: input.folderId,
      kinds: input.type ? [input.type] : undefined,
      limit,
    });
    return { libraryId: result.libraryId, saves: result.saves.map(summarize), nextCursor: null };
  }

  const query: ApiLibraryQueryInput = {
    keywords: keywords || undefined,
    sortKey: "savedAt",
    sortDir: "desc",
    include: ["saves"],
    limit,
    cursor: decodeCursor(input.cursor),
    scope: {
      source: input.source || undefined,
      tag: input.tag || undefined,
      folderIds: input.folderId ? [input.folderId] : undefined,
      savedSince: parseSavedSince(input.savedSince),
      untagged: input.untagged || undefined,
      deletedOnly: input.inTrash || undefined,
    },
    query: input.type
      ? { combinator: "and", rules: [{ field: "type", operator: "in", value: [input.type] }] }
      : undefined,
  };
  const page = await api.query(query);
  return {
    libraryId: page.libraryId,
    total: page.total,
    saves: (page.saves ?? []).map(summarize),
    nextCursor: encodeCursor(page.nextCursor),
  };
}
