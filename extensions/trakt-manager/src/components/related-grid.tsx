import { useCachedPromise } from "@raycast/utils";
import { initTraktClient } from "../lib/client";
import { type PaginationOptions } from "../lib/pagination";
import { withPagination } from "../lib/schema";
import { MediaEntry, MediaGrid } from "./media-grid";

const PAGE_LIMIT = 20;

/** Movies or shows Trakt lists as related to one title (`/movies/:id/related`, `/shows/:id/related`). */
export const RelatedGrid = ({
  mediaType,
  traktId,
  title,
}: {
  mediaType: "movie" | "show";
  traktId: number;
  title: string;
}) => {
  const traktClient = initTraktClient();
  const { isLoading, data, pagination } = useCachedPromise(
    (type: "movie" | "show", id: number) =>
      async (options: PaginationOptions): Promise<{ data: MediaEntry[]; hasMore: boolean }> => {
        const query = { page: options.page + 1, limit: PAGE_LIMIT, extended: "full,cloud9" as const };
        const response =
          type === "movie"
            ? await traktClient.movies.getRelatedMovies({ params: { id }, query })
            : await traktClient.shows.getRelatedShows({ params: { id }, query });
        if (response.status !== 200) throw new Error("Could not load similar titles");

        const page = withPagination(response);
        const entries: MediaEntry[] =
          type === "movie"
            ? (page.data as typeof response.body).map((movie) => ({ mediaType: "movie", movie }) as MediaEntry)
            : (page.data as typeof response.body).map((show) => ({ mediaType: "show", show }) as MediaEntry);
        return {
          data: entries,
          hasMore: page.pagination["x-pagination-page"] < page.pagination["x-pagination-page-count"],
        };
      },
    [mediaType, traktId],
    { keepPreviousData: true, failureToastOptions: { title: "Could not load similar titles" } },
  );

  return (
    <MediaGrid
      entries={data}
      isLoading={isLoading}
      pagination={pagination}
      emptyViewTitle={`No titles similar to ${title}`}
      searchBarPlaceholder={`Titles similar to ${title}`}
    />
  );
};
