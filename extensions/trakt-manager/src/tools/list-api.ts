import {
  scanPageComplete,
  TraktList,
  TraktListEntry,
  TraktListItemsBody,
  TraktListSchema,
  withPagination,
} from "../lib/schema";
import {
  assertListId,
  EpisodeKey,
  episodeCode,
  parseEpisodeKeys,
  parseSeasonKeys,
  parseTraktIds,
  SeasonKey,
} from "./list-matching";
import { describeMedia } from "./resolve-media";
import {
  executeToolCall,
  executeToolCallAllowingNotFound,
  TRAKT_LOOKUP_PAGE_SIZE,
  toolTraktClient,
} from "./tool-client";

export { summarizeLabels } from "./list-matching";

/** Upper bound on items resolved for one add/remove call, so a confirmation stays bounded. */
export const LIST_BATCH_CAP = 50;

const MAX_LIST_PAGES = 20;

/**
 * Every personal list on the account. `/users/:id/lists` is paginated and Trakt applies a low
 * default limit when none is sent, so a single unpaginated call silently misses lists.
 */
export async function fetchAllLists(): Promise<{ lists: TraktList[]; exhaustive: boolean }> {
  const lists: TraktList[] = [];

  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
    const res = await executeToolCall(
      (signal) =>
        toolTraktClient.users.getLists({
          params: { id: "me" },
          query: { page, limit: TRAKT_LOOKUP_PAGE_SIZE },
          fetchOptions: { signal },
        }),
      "Failed to fetch your Trakt personal lists",
    );
    const paginated = withPagination(res);
    lists.push(...paginated.data);

    if (scanPageComplete(paginated.data.length, paginated.pagination, TRAKT_LOOKUP_PAGE_SIZE)) {
      return { lists, exhaustive: true };
    }
  }

  return { lists, exhaustive: false };
}

/**
 * Fetch one of the user's lists by ID or slug. Throws when it does not exist, which blocks
 * any write that would otherwise target a list the confirmation could not name.
 */
export async function getOwnList(listId: string): Promise<TraktList> {
  const id = assertListId(listId);
  const res = await executeToolCallAllowingNotFound(
    (signal) =>
      toolTraktClient.users.getList({
        params: { id: "me", listId: id },
        fetchOptions: { signal },
      }),
    `Failed to look up the list "${id}"`,
  );

  const parsed = res ? TraktListSchema.safeParse(res.body) : undefined;
  if (!parsed?.success) {
    throw new Error(`No personal list matches "${id}". Use \`get-lists\` to obtain a valid list ID before writing.`);
  }

  return parsed.data;
}

export async function fetchListItems(
  listId: string,
  listName: string,
  maxPages = MAX_LIST_PAGES,
): Promise<{ items: TraktListEntry[]; totalItems: number; exhaustive: boolean }> {
  const id = assertListId(listId);
  const items: TraktListEntry[] = [];
  let totalItems = 0;

  for (let page = 1; page <= maxPages; page++) {
    const res = await executeToolCall(
      (signal) =>
        toolTraktClient.users.getListItems({
          params: { id: "me", listId: id, type: "movie,show,season,episode" },
          query: { page, limit: TRAKT_LOOKUP_PAGE_SIZE },
          fetchOptions: { signal },
        }),
      `Failed to fetch items of the list "${listName}"`,
    );
    const paginated = withPagination(res);
    totalItems = paginated.pagination["x-pagination-item-count"] || totalItems;
    items.push(...paginated.data);

    if (scanPageComplete(paginated.data.length, paginated.pagination, TRAKT_LOOKUP_PAGE_SIZE)) {
      return { items, totalItems: totalItems || items.length, exhaustive: true };
    }
  }

  return { items, totalItems: Math.max(totalItems, items.length), exhaustive: false };
}

export type ListSelectionInput = {
  movieTraktIds?: string;
  showTraktIds?: string;
  seasons?: string;
  episodes?: string;
};

export type ResolvedListSelection = {
  body: TraktListItemsBody;
  labels: string[];
  counts: { movies: number; shows: number; seasons: number; episodes: number };
  total: number;
};

async function resolveSeasons(keys: SeasonKey[], showLabels: Map<number, string>) {
  const byShow = new Map<number, number[]>();
  for (const key of keys) byShow.set(key.showTraktId, [...(byShow.get(key.showTraktId) ?? []), key.seasonNumber]);

  const resolved = await Promise.all(
    [...byShow.entries()].map(async ([showTraktId, numbers]) => {
      const res = await executeToolCallAllowingNotFound(
        (signal) =>
          toolTraktClient.shows.getSeasons({
            params: { showid: showTraktId },
            query: { extended: "full" },
            fetchOptions: { signal },
          }),
        `Failed to fetch the seasons of the show with Trakt ID ${showTraktId}`,
      );
      if (!res) throw new Error(`No Trakt show exists with ID ${showTraktId}. Re-resolve the show before writing.`);

      const showLabel = showLabels.get(showTraktId) ?? `Show ${showTraktId}`;
      return numbers.map((seasonNumber) => {
        const season = res.body.find((item) => item.number === seasonNumber);
        if (!season) {
          throw new Error(`${showLabel} has no season ${seasonNumber} on Trakt. Check the season number.`);
        }
        return { traktId: season.ids.trakt, label: `${showLabel} Season ${seasonNumber}` };
      });
    }),
  );

  return resolved.flat();
}

async function resolveEpisodes(keys: EpisodeKey[], showLabels: Map<number, string>) {
  return Promise.all(
    keys.map(async ({ showTraktId, seasonNumber, episodeNumber }) => {
      const code = episodeCode(seasonNumber, episodeNumber);
      const showLabel = showLabels.get(showTraktId) ?? `Show ${showTraktId}`;
      const res = await executeToolCallAllowingNotFound(
        (signal) =>
          toolTraktClient.shows.getEpisode({
            params: { showid: showTraktId, seasonNumber, episodeNumber },
            query: { extended: "full" },
            fetchOptions: { signal },
          }),
        `Failed to find ${code} of the show with Trakt ID ${showTraktId}`,
      );
      if (!res?.body?.ids?.trakt) {
        throw new Error(`${showLabel} has no episode ${code} on Trakt. Check the season and episode numbers.`);
      }
      const title = res.body.title;
      return { traktId: res.body.ids.trakt, label: title ? `${showLabel} ${code} "${title}"` : `${showLabel} ${code}` };
    }),
  );
}

/**
 * Resolve every item of an add/remove batch against Trakt before anything is written.
 *
 * Movie and show IDs share a numeric space, so each one is looked up in the namespace it was
 * sent under: an ID that is not a movie (or not a show) blocks the batch instead of writing
 * an unrelated title. Seasons and episodes are addressed through their show, because
 * `/search/trakt/:id` does not resolve season IDs.
 */
export async function resolveListSelection(input: ListSelectionInput): Promise<ResolvedListSelection> {
  const movies = parseTraktIds(input.movieTraktIds);
  const shows = parseTraktIds(input.showTraktIds);
  const seasons = parseSeasonKeys(input.seasons);
  const episodes = parseEpisodeKeys(input.episodes);

  const invalid = [
    ...movies.invalid.map((value) => `movie "${value}"`),
    ...shows.invalid.map((value) => `show "${value}"`),
    ...seasons.invalid.map((value) => `season "${value}" (expected showTraktId:seasonNumber)`),
    ...episodes.invalid.map((value) => `episode "${value}" (expected showTraktId:season:episode)`),
  ];
  if (invalid.length > 0) {
    throw new Error(`Invalid item(s): ${invalid.join(", ")}. Nothing was written.`);
  }

  const total = movies.ids.length + shows.ids.length + seasons.keys.length + episodes.keys.length;
  if (total === 0) {
    throw new Error("Provide at least one item in `movieTraktIds`, `showTraktIds`, `seasons` or `episodes`.");
  }
  if (total > LIST_BATCH_CAP) {
    throw new Error(`At most ${LIST_BATCH_CAP} items can be changed per call (received ${total}). Split the batch.`);
  }

  const parentShows = [...new Set([...seasons.keys, ...episodes.keys].map((key) => key.showTraktId))];
  const [movieLabels, showLabels, parentLabels] = await Promise.all([
    Promise.all(movies.ids.map((id) => describeMedia("movie", id))),
    Promise.all(shows.ids.map((id) => describeMedia("show", id))),
    Promise.all(parentShows.map(async (id) => [id, await describeMedia("show", id)] as const)),
  ]);
  const parentLabelMap = new Map(parentLabels);

  const [resolvedSeasons, resolvedEpisodes] = await Promise.all([
    resolveSeasons(seasons.keys, parentLabelMap),
    resolveEpisodes(episodes.keys, parentLabelMap),
  ]);

  const ids = (values: number[]) => (values.length > 0 ? values.map((trakt) => ({ ids: { trakt } })) : undefined);

  return {
    body: {
      movies: ids(movies.ids),
      shows: ids(shows.ids),
      seasons: ids([...new Set(resolvedSeasons.map((item) => item.traktId))]),
      episodes: ids([...new Set(resolvedEpisodes.map((item) => item.traktId))]),
    },
    labels: [
      ...movieLabels,
      ...showLabels,
      ...resolvedSeasons.map((item) => item.label),
      ...resolvedEpisodes.map((item) => item.label),
    ],
    counts: {
      movies: movies.ids.length,
      shows: shows.ids.length,
      seasons: resolvedSeasons.length,
      episodes: resolvedEpisodes.length,
    },
    total,
  };
}
