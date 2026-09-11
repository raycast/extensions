import { Toast, showToast } from "@raycast/api";
import { type MutableRefObject } from "react";
import { withPagination } from "./schema";

type TraktApiResponse = { status: number; headers: Headers; body: unknown };

type PaginationHeaders = { "x-pagination-page": number; "x-pagination-page-count": number };

type PaginatedResult<T> = { data: T[]; hasMore: boolean };

export type CombinedMediaItem<MovieItem, ShowItem> =
  { mediaType: "movie"; item: MovieItem } | { mediaType: "show"; item: ShowItem };

const hasMorePages = (pagination?: PaginationHeaders) =>
  (pagination?.["x-pagination-page"] ?? 0) < (pagination?.["x-pagination-page-count"] ?? 0);

/**
 * Fetches a single page of a single media type and tags each item with its `mediaType`.
 * The `Item` type is supplied by the caller because the ts-rest response body is a
 * status-discriminated union that can't be narrowed generically here.
 */
export async function fetchMediaPage<MediaType extends "movie" | "show", Item>(
  mediaType: MediaType,
  request: () => Promise<TraktApiResponse>,
): Promise<PaginatedResult<{ mediaType: MediaType; item: Item }>> {
  const response = await request();
  if (response.status !== 200) return { data: [], hasMore: false };

  const paginated = withPagination(response);
  const items = paginated.data as Item[];

  return {
    data: items.map((item) => ({ mediaType, item })),
    hasMore: hasMorePages(paginated.pagination),
  };
}

/**
 * Fetches movies and shows in parallel up to the page needed to fill a combined window,
 * merges them via `sort`, then slices the requested window. Used by the "all" filter where
 * two paginated sources are interleaved into a single grid.
 */
export async function fetchCombinedMediaPage<MovieItem, ShowItem>(options: {
  page: number;
  perPageLimit: number;
  combinedPageLimit: number;
  requestMoviePage: (page: number) => Promise<TraktApiResponse>;
  requestShowPage: (page: number) => Promise<TraktApiResponse>;
  sort: (items: CombinedMediaItem<MovieItem, ShowItem>[]) => CombinedMediaItem<MovieItem, ShowItem>[];
}): Promise<PaginatedResult<CombinedMediaItem<MovieItem, ShowItem>>> {
  const { page, perPageLimit, combinedPageLimit, requestMoviePage, requestShowPage, sort } = options;

  const pageCount = Math.ceil(((page + 1) * combinedPageLimit) / perPageLimit);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  const [movieResponses, showResponses] = await Promise.all([
    Promise.all(pages.map(requestMoviePage)),
    Promise.all(pages.map(requestShowPage)),
  ]);

  const moviePages = movieResponses
    .filter((response) => response.status === 200)
    .map((response) => withPagination(response));
  const showPages = showResponses
    .filter((response) => response.status === 200)
    .map((response) => withPagination(response));

  const merged = sort([
    ...moviePages.flatMap((moviePage) =>
      (moviePage.data as MovieItem[]).map((item) => ({ mediaType: "movie" as const, item })),
    ),
    ...showPages.flatMap((showPage) =>
      (showPage.data as ShowItem[]).map((item) => ({ mediaType: "show" as const, item })),
    ),
  ]);

  const sliceStart = page * combinedPageLimit;
  const sliceEnd = sliceStart + combinedPageLimit;
  const moviesHasMore = hasMorePages(moviePages.at(-1)?.pagination);
  const showsHasMore = hasMorePages(showPages.at(-1)?.pagination);

  return {
    data: merged.slice(sliceStart, sliceEnd),
    hasMore: merged.length > sliceEnd || moviesHasMore || showsHasMore,
  };
}

export function mediaListCacheOptions(abortable: MutableRefObject<AbortController | undefined>) {
  return {
    initialData: undefined,
    keepPreviousData: true,
    abortable,
    onError(error: Error) {
      showToast({
        title: error.message,
        style: Toast.Style.Failure,
      });
    },
  };
}
