import { fetchLinks } from "./api";
import { FetchLinksParams } from "./types";

export const PAGE_SIZE = 100;

/** Offsets advance by rows returned, including on a short intermediate page. */
export async function fetchLinksPage(params: FetchLinksParams = {}, signal?: AbortSignal) {
  const offset = params.offset ?? 0;
  const limit = params.limit ?? PAGE_SIZE;
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("Offset must be a non-negative integer.");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > PAGE_SIZE) {
    throw new Error(`Limit must be an integer from 1 to ${PAGE_SIZE}.`);
  }
  const response = await fetchLinks({ ...params, offset, limit }, signal);
  signal?.throwIfAborted();
  if (!response.links.length && offset < response.total) {
    throw new Error("Shiori returned an empty page before the end of the results. Please refresh.");
  }
  const nextOffset = offset + response.links.length;
  const hasMore = nextOffset < response.total;
  return { ...response, offset, hasMore, nextOffset: hasMore ? nextOffset : null };
}

export async function searchBookmarks(params: FetchLinksParams) {
  const result = await fetchLinksPage(params);
  return {
    links: result.links.map((link) => ({
      id: link.id,
      url: link.url,
      title: link.title,
      summary: link.summary,
      read: Boolean(link.read_at),
      createdAt: link.created_at,
    })),
    total: result.total,
    offset: result.offset,
    hasMore: result.hasMore,
    nextOffset: result.nextOffset,
  };
}
