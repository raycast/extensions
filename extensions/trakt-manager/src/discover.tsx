import { Grid } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { MediaEntry, MediaGrid } from "./components/media-grid";
import { initTraktClient } from "./lib/client";
import { type PaginationOptions } from "./lib/pagination";
import { TraktMovieBaseItem as MediaMovie, TraktShowBaseItem as MediaShow, withPagination } from "./lib/schema";
import { useCheckinSync } from "./lib/use-checkin-state";
import { useRatingsSync } from "./lib/use-ratings";
import { useWatchedSync } from "./lib/use-watched";
import { useWatchlistSync } from "./lib/use-watchlist-ids";

type Feed =
  | "trending-movies"
  | "trending-shows"
  | "popular-movies"
  | "popular-shows"
  | "anticipated-movies"
  | "anticipated-shows";

const FEEDS: { value: Feed; title: string }[] = [
  { value: "trending-movies", title: "Trending Movies" },
  { value: "trending-shows", title: "Trending Shows" },
  { value: "popular-movies", title: "Popular Movies" },
  { value: "popular-shows", title: "Popular Shows" },
  { value: "anticipated-movies", title: "Anticipated Movies" },
  { value: "anticipated-shows", title: "Anticipated Shows" },
];

const PAGE_LIMIT = 20;
const count = (value: number, unit: string) => `${value.toLocaleString()} ${unit}`;

type FeedPage = { status: number; headers: Headers; entries: MediaEntry[] };
type BrowseQuery = { page: number; limit: number; extended: "full,cloud9" };

/** One page of a feed, with a line under each title: watchers now (trending) or lists (anticipated). */
async function fetchFeed(
  traktClient: ReturnType<typeof initTraktClient>,
  feed: Feed,
  query: BrowseQuery,
): Promise<FeedPage> {
  const page = <T,>(response: { status: number; headers: Headers; body: unknown }, map: (body: T) => MediaEntry[]) => ({
    status: response.status,
    headers: response.headers,
    entries: response.status === 200 ? map(response.body as T) : [],
  });

  switch (feed) {
    case "trending-movies":
      return page(
        await traktClient.movies.getTrendingMovies({ query }),
        (body: { watchers: number; movie: MediaMovie }[]) =>
          body.map((item) => ({ mediaType: "movie", movie: item.movie, subtitle: count(item.watchers, "watching") })),
      );
    case "trending-shows":
      return page(
        await traktClient.shows.getTrendingShows({ query }),
        (body: { watchers: number; show: MediaShow }[]) =>
          body.map((item) => ({ mediaType: "show", show: item.show, subtitle: count(item.watchers, "watching") })),
      );
    case "popular-movies":
      return page(await traktClient.movies.getPopularMovies({ query }), (body: MediaMovie[]) =>
        body.map((movie) => ({ mediaType: "movie", movie })),
      );
    case "popular-shows":
      return page(await traktClient.shows.getPopularShows({ query }), (body: MediaShow[]) =>
        body.map((show) => ({ mediaType: "show", show })),
      );
    case "anticipated-movies":
      return page(
        await traktClient.movies.getAnticipatedMovies({ query }),
        (body: { list_count: number; movie: MediaMovie }[]) =>
          body.map((item) => ({ mediaType: "movie", movie: item.movie, subtitle: count(item.list_count, "lists") })),
      );
    case "anticipated-shows":
      return page(
        await traktClient.shows.getAnticipatedShows({ query }),
        (body: { list_count: number; show: MediaShow }[]) =>
          body.map((item) => ({ mediaType: "show", show: item.show, subtitle: count(item.list_count, "lists") })),
      );
  }
}

export default function Command() {
  const [feed, setFeed] = useState<Feed>("trending-movies");
  const traktClient = initTraktClient();
  useWatchlistSync();
  useRatingsSync();
  useWatchedSync();
  useCheckinSync();

  const { isLoading, data, pagination } = useCachedPromise(
    (feed: Feed) =>
      async (options: PaginationOptions): Promise<{ data: MediaEntry[]; hasMore: boolean }> => {
        const query = { page: options.page + 1, limit: PAGE_LIMIT, extended: "full,cloud9" as const };
        const page = await fetchFeed(traktClient, feed, query);
        if (page.status !== 200) throw new Error("Could not load this list from Trakt");
        const { pagination } = withPagination({ ...page, body: page.entries });
        return {
          data: page.entries,
          hasMore: pagination["x-pagination-page"] < pagination["x-pagination-page-count"],
        };
      },
    [feed],
    { keepPreviousData: true, failureToastOptions: { title: "Could not load this list from Trakt" } },
  );

  return (
    <MediaGrid
      entries={data}
      isLoading={isLoading}
      pagination={pagination}
      emptyViewTitle="Nothing to show"
      searchBarPlaceholder="Filter titles"
      searchBarAccessory={
        <Grid.Dropdown tooltip="List" value={feed} onChange={(value) => setFeed(value as Feed)}>
          {FEEDS.map((option) => (
            <Grid.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </Grid.Dropdown>
      }
    />
  );
}
