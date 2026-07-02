import { initTraktClient } from "./client";
import { TraktMovieHistoryListItem, TraktMovieListItem, TraktShowHistoryListItem, TraktShowListItem } from "./schema";

type TraktClient = ReturnType<typeof initTraktClient>;

type MutationOptions = {
  signal?: AbortSignal;
};

export async function addMovieToWatchlist(
  traktClient: TraktClient,
  movie: TraktMovieListItem,
  { signal }: MutationOptions,
) {
  await traktClient.movies.addMovieToWatchlist({
    body: {
      movies: [
        {
          ids: { trakt: movie.movie.ids.trakt },
        },
      ],
    },
    fetchOptions: {
      signal,
    },
  });
}

export async function removeMovieFromWatchlist(
  traktClient: TraktClient,
  movie: TraktMovieListItem,
  { signal }: MutationOptions,
) {
  await traktClient.movies.removeMovieFromWatchlist({
    body: {
      movies: [
        {
          ids: { trakt: movie.movie.ids.trakt },
        },
      ],
    },
    fetchOptions: {
      signal,
    },
  });
}

export async function addMovieToHistory(
  traktClient: TraktClient,
  movie: TraktMovieListItem,
  { signal }: MutationOptions,
) {
  await traktClient.movies.addMovieToHistory({
    body: {
      movies: [
        {
          ids: { trakt: movie.movie.ids.trakt },
          watched_at: new Date().toISOString(),
        },
      ],
    },
    fetchOptions: {
      signal,
    },
  });
}

export async function removeMovieFromHistory(
  traktClient: TraktClient,
  movie: TraktMovieHistoryListItem,
  { signal }: MutationOptions,
) {
  await traktClient.movies.removeMovieFromHistory({
    body: {
      movies: [
        {
          ids: {
            trakt: movie.movie.ids.trakt,
          },
        },
      ],
    },
    fetchOptions: {
      signal,
    },
  });
}

export async function addShowToWatchlist(
  traktClient: TraktClient,
  show: TraktShowListItem,
  { signal }: MutationOptions,
) {
  await traktClient.shows.addShowToWatchlist({
    body: {
      shows: [
        {
          ids: {
            trakt: show.show.ids.trakt,
          },
        },
      ],
    },
    fetchOptions: {
      signal,
    },
  });
}

export async function removeShowFromWatchlist(
  traktClient: TraktClient,
  show: TraktShowListItem,
  { signal }: MutationOptions,
) {
  await traktClient.shows.removeShowFromWatchlist({
    body: {
      shows: [
        {
          ids: {
            trakt: show.show.ids.trakt,
          },
        },
      ],
    },
    fetchOptions: {
      signal,
    },
  });
}

export async function addShowToHistory(traktClient: TraktClient, show: TraktShowListItem, { signal }: MutationOptions) {
  await traktClient.shows.addShowToHistory({
    body: {
      shows: [
        {
          ids: {
            trakt: show.show.ids.trakt,
          },
          watched_at: new Date().toISOString(),
        },
      ],
    },
    fetchOptions: {
      signal,
    },
  });
}

export async function checkInFirstEpisodeToHistory(
  traktClient: TraktClient,
  show: TraktShowListItem,
  { signal }: MutationOptions,
) {
  const response = await traktClient.shows.getEpisode({
    params: {
      showid: show.show.ids.trakt,
      seasonNumber: 1,
      episodeNumber: 1,
    },
    query: {
      extended: "full",
    },
    fetchOptions: {
      signal,
    },
  });

  if (response.status !== 200) throw new Error("Failed to get first episode");
  const firstEpisode = response.body;

  await traktClient.shows.checkInEpisode({
    body: {
      episodes: [
        {
          ids: {
            trakt: firstEpisode.ids.trakt,
          },
          watched_at: new Date().toISOString(),
        },
      ],
    },
    fetchOptions: {
      signal,
    },
  });
}

export async function removeEpisodeFromHistory(
  traktClient: TraktClient,
  episode: TraktShowHistoryListItem,
  { signal }: MutationOptions,
) {
  await traktClient.shows.removeEpisodeFromHistory({
    body: {
      episodes: [
        {
          ids: {
            trakt: episode.episode.ids.trakt,
          },
        },
      ],
    },
    fetchOptions: {
      signal,
    },
  });
}
