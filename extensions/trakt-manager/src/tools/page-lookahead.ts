import { scanPageComplete } from "../lib/schema";

type PaginationHeaders = Parameters<typeof scanPageComplete>[1];

/**
 * Whether a browse page has a next page. A full page does not prove it: `up_next_nitro` sends a
 * fixed page count (trakt/trakt-api#926), and a list that ends exactly on a page boundary fills the
 * last page. So when this page looks unfinished, fetch the next one and count its items.
 * Only a hint: a failed lookahead must not discard the page already fetched, so it keeps "maybe more".
 */
export async function confirmHasMore(
  pageLength: number,
  pagination: PaginationHeaders,
  requestedLimit: number,
  fetchNextPageLength: () => Promise<number>,
): Promise<boolean> {
  if (scanPageComplete(pageLength, pagination, requestedLimit)) return false;

  try {
    return (await fetchNextPageLength()) > 0;
  } catch {
    return true;
  }
}
