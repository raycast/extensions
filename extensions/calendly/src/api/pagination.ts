import type { CalendlyCollectionResponse } from "./types";

export const MAX_COLLECTION_PAGES = 50;

export type CalendlyQuery = Record<string, string | number | boolean | undefined>;

export async function collectCalendlyPages<T>(
  path: string,
  query: CalendlyQuery | undefined,
  requestPage: (nextPath: string, nextQuery: CalendlyQuery | undefined) => Promise<CalendlyCollectionResponse<T>>,
) {
  const items: T[] = [];
  let nextPath = path;
  let nextQuery = query;

  for (let page = 0; page < MAX_COLLECTION_PAGES; page++) {
    const response = await requestPage(nextPath, nextQuery);
    items.push(...response.collection);

    const nextPage = response.pagination?.next_page;
    const nextPageToken = response.pagination?.next_page_token;
    if (!nextPage && !nextPageToken) return items;

    if (nextPage) {
      nextPath = nextPage;
      nextQuery = undefined;
    } else {
      nextPath = path;
      nextQuery = { ...query, page_token: nextPageToken ?? undefined };
    }
  }

  throw new Error(`Calendly returned more than ${MAX_COLLECTION_PAGES} pages; refusing to return partial results.`);
}
