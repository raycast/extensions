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

export async function addMovieIdToWatchlist(
  traktClient: TraktClient,
  traktId: number,
  { signal }: MutationOptions = {},
) {
  return traktClient.movies.addMovieToWatchlist({
    body: {
      movies: [{ ids: { trakt: traktId } }],
    },
    fetchOptions: { signal },
  });
}

export async function removeMovieIdFromWatchlist(
  traktClient: TraktClient,
  traktId: number,
  { signal }: MutationOptions = {},
) {
  return traktClient.movies.removeMovieFromWatchlist({
    body: {
      movies: [{ ids: { trakt: traktId } }],
    },
    fetchOptions: { signal },
  });
}

export async function addShowIdToWatchlist(
  traktClient: TraktClient,
  traktId: number,
  { signal }: MutationOptions = {},
) {
  return traktClient.shows.addShowToWatchlist({
    body: {
      shows: [{ ids: { trakt: traktId } }],
    },
    fetchOptions: { signal },
  });
}

export async function removeShowIdFromWatchlist(
  traktClient: TraktClient,
  traktId: number,
  { signal }: MutationOptions = {},
) {
  return traktClient.shows.removeShowFromWatchlist({
    body: {
      shows: [{ ids: { trakt: traktId } }],
    },
    fetchOptions: { signal },
  });
}

export async function addMovieIdToHistory(
  traktClient: TraktClient,
  traktId: number,
  { signal, watchedAt }: MutationOptions & { watchedAt?: string } = {},
) {
  return traktClient.movies.addMovieToHistory({
    body: {
      movies: [
        {
          ids: { trakt: traktId },
          watched_at: watchedAt ?? new Date().toISOString(),
        },
      ],
    },
    fetchOptions: { signal },
  });
}

export async function addShowIdToHistory(
  traktClient: TraktClient,
  traktId: number,
  { signal, watchedAt }: MutationOptions & { watchedAt?: string } = {},
) {
  return traktClient.shows.addShowToHistory({
    body: {
      shows: [
        {
          ids: { trakt: traktId },
          watched_at: watchedAt ?? new Date().toISOString(),
        },
      ],
    },
    fetchOptions: { signal },
  });
}

export async function addEpisodeIdToHistory(
  traktClient: TraktClient,
  episodeTraktId: number,
  { signal, watchedAt }: MutationOptions & { watchedAt?: string } = {},
) {
  return traktClient.shows.addEpisodeToHistory({
    body: {
      episodes: [
        {
          ids: { trakt: episodeTraktId },
          watched_at: watchedAt ?? new Date().toISOString(),
        },
      ],
    },
    fetchOptions: { signal },
  });
}

export async function removeMovieIdFromHistory(
  traktClient: TraktClient,
  traktId: number,
  { signal }: MutationOptions = {},
) {
  return traktClient.movies.removeMovieFromHistory({
    body: {
      movies: [
        {
          ids: { trakt: traktId },
        },
      ],
    },
    fetchOptions: { signal },
  });
}

export async function removeShowIdFromHistory(
  traktClient: TraktClient,
  traktId: number,
  { signal }: MutationOptions = {},
) {
  return traktClient.shows.removeShowFromHistory({
    body: {
      shows: [
        {
          ids: { trakt: traktId },
        },
      ],
    },
    fetchOptions: { signal },
  });
}

export async function removeEpisodeIdFromHistory(
  traktClient: TraktClient,
  episodeTraktId: number,
  { signal }: MutationOptions = {},
) {
  return traktClient.shows.removeEpisodeFromHistory({
    body: {
      episodes: [
        {
          ids: { trakt: episodeTraktId },
        },
      ],
    },
    fetchOptions: { signal },
  });
}

export type RateMediaArgs = {
  type: "movie" | "show" | "season" | "episode";
  traktId: number;
  rating: number;
  ratedAt?: string;
};

export async function rateMedia(
  traktClient: TraktClient,
  { type, traktId, rating, ratedAt }: RateMediaArgs,
  { signal }: MutationOptions = {},
) {
  const ratingItem = {
    ids: { trakt: traktId },
    rating,
    rated_at: ratedAt,
  };

  const body: {
    movies?: (typeof ratingItem)[];
    shows?: (typeof ratingItem)[];
    seasons?: (typeof ratingItem)[];
    episodes?: (typeof ratingItem)[];
  } = {};

  if (type === "movie") body.movies = [ratingItem];
  else if (type === "show") body.shows = [ratingItem];
  else if (type === "season") body.seasons = [ratingItem];
  else if (type === "episode") body.episodes = [ratingItem];

  return traktClient.sync.addRatings({
    body,
    fetchOptions: { signal },
  });
}

export async function removeMediaRating(
  traktClient: TraktClient,
  { type, traktId }: { type: "movie" | "show" | "season" | "episode"; traktId: number },
  { signal }: MutationOptions = {},
) {
  const item = { ids: { trakt: traktId } };
  const body: {
    movies?: (typeof item)[];
    shows?: (typeof item)[];
    seasons?: (typeof item)[];
    episodes?: (typeof item)[];
  } = {};

  if (type === "movie") body.movies = [item];
  else if (type === "show") body.shows = [item];
  else if (type === "season") body.seasons = [item];
  else if (type === "episode") body.episodes = [item];

  return traktClient.sync.removeRatings({
    body,
    fetchOptions: { signal },
  });
}
