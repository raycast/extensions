import { EagleClient } from "../@types/eagle-v2";
import { eagleV2 } from "./api";
import {
  activeLibrary,
  identifier,
  itemDetails,
  rating,
  requireLibrary,
  resolveFolders,
  sourceUrl,
  strings,
  text,
} from "./ai-library";

export type FindInput = {
  itemId?: string;
  query?: string;
  tags?: string[];
  folderIds?: string[];
  extension?: string;
  sourceUrl?: string;
  rating?: number;
  offset?: number;
  limit?: number;
};

export async function findItems(input: FindInput, client: EagleClient = eagleV2) {
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 50;
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("offset must be a non-negative integer and limit must be an integer from 1 to 100.");
  }
  const tags = strings(input.tags, "tags");
  const folderIds = strings(input.folderIds, "folderIds");
  const hasFilters =
    tags.length ||
    folderIds.length ||
    input.extension !== undefined ||
    input.sourceUrl !== undefined ||
    input.rating !== undefined;
  if (input.itemId !== undefined) identifier(input.itemId, "itemId");
  if (input.query !== undefined) text(input.query, "query");
  if (input.itemId !== undefined && (input.query !== undefined || hasFilters)) {
    throw new Error("Use itemId alone for an exact lookup.");
  }
  if (input.query !== undefined && hasFilters)
    throw new Error("Use query alone, or use the structured filters without query.");
  if (input.extension !== undefined && !/^[a-zA-Z0-9]+$/.test(input.extension)) {
    throw new Error("extension must be a file extension without a dot.");
  }
  if (input.sourceUrl !== undefined) sourceUrl(input.sourceUrl);
  rating(input.rating);
  const library = await activeLibrary(client);
  resolveFolders(folderIds, library);
  const page =
    input.query !== undefined
      ? await client.query(input.query, offset, limit)
      : await client.items({
          ids: input.itemId ? [input.itemId] : undefined,
          tags: tags.length ? tags : undefined,
          folders: folderIds.length ? folderIds : undefined,
          ext: input.extension,
          url: input.sourceUrl,
          rating: input.rating,
          offset: input.itemId ? 0 : offset,
          limit: input.itemId ? 1 : limit,
        });
  await requireLibrary(library.id, client);
  return {
    libraryId: library.id,
    libraryName: library.name,
    items: page.data.map((item) => itemDetails(item, library)),
    total: page.total,
    offset: page.offset,
    limit: page.limit,
    nextOffset: page.offset + page.data.length < page.total ? page.offset + page.data.length : undefined,
  };
}
