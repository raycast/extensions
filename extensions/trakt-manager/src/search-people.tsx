import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { MediaEntry, MediaGrid } from "./components/media-grid";
import { initTraktClient } from "./lib/client";
import { TRAKT_APP_URL } from "./lib/constants";
import { toCredits } from "./lib/credits";
import { type PaginationOptions } from "./lib/pagination";
import { TraktMovieBaseItem, TraktPersonSearchItem, TraktShowBaseItem, withPagination } from "./lib/schema";
import { useCheckinSync } from "./lib/use-checkin-state";
import { useRatingsSync } from "./lib/use-ratings";
import { useWatchedSync } from "./lib/use-watched";
import { useWatchlistSync } from "./lib/use-watchlist-ids";

const PAGE_LIMIT = 20;

/** The movies or the shows a person is credited on, one entry per title with every role on it. */
const PersonCreditsGrid = ({
  personId,
  name,
  mediaType,
}: {
  personId: number;
  name: string;
  mediaType: "movie" | "show";
}) => {
  const traktClient = initTraktClient();
  const { isLoading, data } = useCachedPromise(
    async (id: number, type: "movie" | "show"): Promise<MediaEntry[]> => {
      const query = { extended: "full,cloud9" as const };
      if (type === "movie") {
        const response = await traktClient.search.getPersonMovies({ params: { id }, query });
        if (response.status !== 200) throw new Error("Could not load these credits");
        return toCredits<TraktMovieBaseItem>(response.body, "movie").map(({ title, role }) => ({
          mediaType: "movie",
          movie: title,
          subtitle: role,
        }));
      }
      const response = await traktClient.search.getPersonShows({ params: { id }, query });
      if (response.status !== 200) throw new Error("Could not load these credits");
      return toCredits<TraktShowBaseItem>(response.body, "show").map(({ title, role }) => ({
        mediaType: "show",
        show: title,
        subtitle: role,
      }));
    },
    [personId, mediaType],
    { failureToastOptions: { title: "Could not load these credits" } },
  );

  return (
    <MediaGrid
      entries={data}
      isLoading={isLoading}
      emptyViewTitle={`No ${mediaType === "movie" ? "movies" : "shows"} for ${name}`}
      searchBarPlaceholder={`${mediaType === "movie" ? "Movies" : "Shows"} with ${name}`}
    />
  );
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const traktClient = initTraktClient();
  useWatchlistSync();
  useRatingsSync();
  useWatchedSync();
  useCheckinSync();

  const { isLoading, data, pagination } = useCachedPromise(
    (text: string) =>
      async (options: PaginationOptions): Promise<{ data: TraktPersonSearchItem[]; hasMore: boolean }> => {
        if (!text.trim()) return { data: [], hasMore: false };
        const response = await traktClient.search.searchPeople({
          query: { query: text, page: options.page + 1, limit: PAGE_LIMIT, extended: "full" },
        });
        if (response.status !== 200) throw new Error("Could not search people");
        const page = withPagination(response);
        return {
          data: page.data,
          hasMore: page.pagination["x-pagination-page"] < page.pagination["x-pagination-page-count"],
        };
      },
    [searchText],
    { keepPreviousData: true, failureToastOptions: { title: "Could not search people" } },
  );

  return (
    <List
      isLoading={isLoading}
      throttle
      pagination={pagination}
      searchBarPlaceholder="Search actors and crew"
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView title={searchText ? "No one found" : "Search actors and crew"} icon={Icon.Person} />
      {data?.map(({ person }, index) => (
        <List.Item
          key={`${person.ids.trakt}-${index}`}
          icon={Icon.Person}
          title={person.name}
          accessories={person.known_for_department ? [{ tag: person.known_for_department }] : []}
          actions={
            <ActionPanel>
              <Action.Push
                title="Movies"
                icon={Icon.FilmStrip}
                target={<PersonCreditsGrid personId={person.ids.trakt} name={person.name} mediaType="movie" />}
              />
              <Action.Push
                title="Shows"
                icon={Icon.Monitor}
                target={<PersonCreditsGrid personId={person.ids.trakt} name={person.name} mediaType="show" />}
              />
              {person.ids.slug && (
                <Action.OpenInBrowser
                  icon={getFavicon(TRAKT_APP_URL)}
                  title="Open in Trakt"
                  url={`${TRAKT_APP_URL}/people/${person.ids.slug}`}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
