import { readSyncWrite, syncKindForMedia } from "../tools/sync-write";
import { initTraktClient } from "./client";
import {
  TraktCheckinConflictSchema,
  TraktHistoryAddResponseSchema,
  TraktNoSharing,
  TraktMovieHistoryListItem,
  TraktMovieListItem,
  TraktPlaybackMovieItem,
  TraktShowHistoryListItem,
  TraktShowListItem,
} from "./schema";

type TraktClient = ReturnType<typeof initTraktClient>;

type MutationOptions = {
  signal?: AbortSignal;
};

export async function addMovieToWatchlist(
  traktClient: TraktClient,
  movie: TraktMovieListItem,
  { signal }: MutationOptions,
) {
  const response = await traktClient.movies.addMovieToWatchlist({
    body: { movies: [{ ids: { trakt: movie.movie.ids.trakt } }] },
    fetchOptions: { signal },
  });

  // 2xx alone proves nothing: the movie must be counted as added, or as already there.
  const stored =
    response.status === 200 || response.status === 201
      ? (response.body.added.movies ?? 0) + (response.body.existing?.movies ?? 0)
      : 0;
  if (stored < 1) throw new Error("Trakt did not add this movie to your watchlist");
}

export async function removeMovieFromWatchlist(
  traktClient: TraktClient,
  movie: TraktMovieListItem,
  { signal }: MutationOptions,
) {
  const response = await traktClient.movies.removeMovieFromWatchlist({
    body: { movies: [{ ids: { trakt: movie.movie.ids.trakt } }] },
    fetchOptions: { signal },
  });

  // 2xx alone proves nothing: `deleted` counts what was really on the watchlist.
  if (response.status !== 200 || !((response.body.deleted.movies ?? 0) > 0)) {
    throw new Error("This movie is not in your watchlist");
  }
}

export async function addMovieToHistory(traktClient: TraktClient, movie: TraktMovieListItem, options: MutationOptions) {
  await markMovieWatched(traktClient, movie.movie.ids.trakt, options);
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
  const response = await traktClient.shows.addShowToWatchlist({
    body: { shows: [{ ids: { trakt: show.show.ids.trakt } }] },
    fetchOptions: { signal },
  });

  // 2xx alone proves nothing: the show must be counted as added, or as already there.
  const stored =
    response.status === 200 || response.status === 201
      ? (response.body.added.shows ?? 0) + (response.body.existing?.shows ?? 0)
      : 0;
  if (stored < 1) throw new Error("Trakt did not add this show to your watchlist");
}

export async function removeShowFromWatchlist(
  traktClient: TraktClient,
  show: TraktShowListItem,
  { signal }: MutationOptions,
) {
  const response = await traktClient.shows.removeShowFromWatchlist({
    body: { shows: [{ ids: { trakt: show.show.ids.trakt } }] },
    fetchOptions: { signal },
  });

  // 2xx alone proves nothing: `deleted` counts what was really on the watchlist.
  if (response.status !== 200 || !((response.body.deleted.shows ?? 0) > 0)) {
    throw new Error("This show is not in your watchlist");
  }
}

export async function addShowToHistory(traktClient: TraktClient, show: TraktShowListItem, options: MutationOptions) {
  await markShowWatched(traktClient, show.show.ids.trakt, options);
}

type HistoryAddResponse = {
  status: number;
  body: unknown;
};

/**
 * `POST /sync/history` answers 2xx even when it stored nothing. Only `added` counts.
 * Trakt does not deduplicate `item + watched_at`, so a caller must never retry on success.
 */
function assertHistoryAdded(response: HistoryAddResponse, kind: "movies" | "episodes") {
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Trakt refused to mark the ${kind === "movies" ? "movie" : "episode"} as watched`);
  }

  const { added } = TraktHistoryAddResponseSchema.parse(response.body);
  if (added[kind] < 1) {
    throw new Error(
      `Trakt did not find this ${kind === "movies" ? "movie" : "episode"}, nothing was marked as watched`,
    );
  }
}

type WatchOptions = MutationOptions & {
  /** `"released"` (episodes only), `"unknown"`, or a UTC ISO datetime. Defaults to now. */
  watchedAt?: string;
};

export async function markMovieWatched(
  traktClient: TraktClient,
  movieTraktId: number,
  { signal, watchedAt }: WatchOptions,
) {
  const response = await traktClient.movies.addMovieToHistory({
    body: { movies: [{ ids: { trakt: movieTraktId }, watched_at: watchedAt ?? new Date().toISOString() }] },
    fetchOptions: { signal },
  });

  assertHistoryAdded(response, "movies");
}

/**
 * `DELETE /sync/playback/:id`: 204 removed it, 404 means the id is not (or no longer) a paused item.
 * Both leave the item out of Continue Watching. Anything else, or a network error, is a failure.
 */
async function dropPlaybackEntry(traktClient: TraktClient, playbackId: number, { signal }: MutationOptions) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await traktClient.movies.dropPlayback({ params: { id: playbackId }, fetchOptions: { signal } });
      if (response.status === 204 || response.status === 404) return true;
    } catch {
      if (signal?.aborted) return false;
    }
  }

  return false;
}

/** Removes a paused movie from Continue Watching without marking it as watched ("Drop movie" on Trakt). */
export async function dropMoviePlayback(
  traktClient: TraktClient,
  entry: TraktPlaybackMovieItem,
  options: MutationOptions,
) {
  if (!(await dropPlaybackEntry(traktClient, entry.id, options))) {
    throw new Error(`Trakt kept "${entry.movie.title}" in Continue Watching. Try again.`);
  }
}

/**
 * Marks a paused movie as watched, then removes its paused entry so it leaves Continue Watching.
 * The watch is written first: if that fails nothing is lost. If only the removal fails, this throws
 * a message that says the watch is recorded, because marking again would add a second play.
 */
export async function markPlaybackMovieWatched(
  traktClient: TraktClient,
  entry: TraktPlaybackMovieItem,
  options: WatchOptions,
) {
  await markMovieWatched(traktClient, entry.movie.ids.trakt, options);

  if (!(await dropPlaybackEntry(traktClient, entry.id, options))) {
    throw new Error(
      `"${entry.movie.title}" is marked as watched, but Trakt kept it in Continue Watching. Do not mark it again; remove it on Trakt Web.`,
    );
  }
}

export async function markEpisodeWatched(
  traktClient: TraktClient,
  episodeTraktId: number,
  { signal, watchedAt }: WatchOptions,
) {
  const response = await traktClient.shows.addEpisodeToHistory({
    body: { episodes: [{ ids: { trakt: episodeTraktId }, watched_at: watchedAt ?? new Date().toISOString() }] },
    fetchOptions: { signal },
  });

  assertHistoryAdded(response, "episodes");
}

/**
 * "Drop show": Trakt hides it from Continue Watching (`dropped`), and Trakt Web also hides it from
 * the calendar. Throws only when the drop fails; a refused calendar hide comes back as
 * `calendarHidden: false`, since the show has already left Continue Watching.
 */
export async function dropShow(traktClient: TraktClient, showTraktId: number, { signal }: MutationOptions) {
  const body = { shows: [{ ids: { trakt: showTraktId } }] };
  const response = await traktClient.shows.dropShow({ body, fetchOptions: { signal } });

  // `POST /users/hidden/:section` creates an entry: Trakt may answer 201 as well as 200.
  const added = response.status === 200 || response.status === 201 ? response.body.added.shows : undefined;
  if (!(added && added > 0)) {
    throw new Error("Trakt did not drop this show. It may already be dropped.");
  }

  return { calendarHidden: await hideShowFromCalendar(traktClient, showTraktId, { signal }) };
}

/**
 * Restores a dropped show (Trakt's "Restore"): it returns to Continue Watching and, since dropping also hid
 * it, to the calendar. Throws when Trakt removed nothing from the dropped list; a calendar step that fails
 * comes back as `calendarRestored: false`, since the show is already restored.
 */
export async function restoreDroppedShow(traktClient: TraktClient, showTraktId: number, { signal }: MutationOptions) {
  const body = { shows: [{ ids: { trakt: showTraktId } }] };
  const response = await traktClient.shows.restoreDroppedShow({ body, fetchOptions: { signal } });
  const deleted = response.status === 200 ? response.body.deleted.shows : undefined;
  if (!(deleted && deleted > 0)) {
    throw new Error("Trakt did not restore this show. It may no longer be dropped.");
  }

  const calendar = await traktClient.shows.unhideShowFromCalendar({ body, fetchOptions: { signal } });
  return { calendarRestored: calendar.status === 200 };
}

/**
 * Hides a show from the calendar. Returns `false` when Trakt refused, so a drop that already
 * succeeded is not reported as failed and only this step needs retrying.
 */
export async function hideShowFromCalendar(traktClient: TraktClient, showTraktId: number, { signal }: MutationOptions) {
  // The client answers a network failure with status 500 rather than throwing, so read the status.
  const response = await traktClient.shows.hideShowFromCalendar({
    body: { shows: [{ ids: { trakt: showTraktId } }] },
    fetchOptions: { signal },
  });
  return response.status === 200 || response.status === 201;
}

/**
 * `DELETE /recommendations/{movies,shows}/:id` ("Not interested" on Trakt). Trakt answers 204 with
 * no body, so the status is the only proof; anything else, network failures included (status 500), throws.
 */
export async function hideRecommendation(
  traktClient: TraktClient,
  type: "movie" | "show",
  traktId: number,
  { signal }: MutationOptions,
) {
  const request = { params: { id: traktId }, fetchOptions: { signal } };
  const response =
    type === "movie"
      ? await traktClient.movies.hideMovieRecommendation(request)
      : await traktClient.shows.hideShowRecommendation(request);

  if (response.status !== 204) {
    throw new Error(`Trakt did not hide this recommendation (HTTP ${response.status}). Try again.`);
  }
}

/** Short, readable reason from an error body, if Trakt sent one. */
function describeBody(body: unknown) {
  if (typeof body === "string" && body.length > 0) return `: ${body.slice(0, 120)}`;

  if (typeof body === "object" && body !== null) {
    const { error, message } = body as { error?: unknown; message?: unknown };
    const reason = typeof error === "string" ? error : typeof message === "string" ? message : undefined;
    if (reason) return `: ${reason.slice(0, 120)}`;
  }

  return "";
}

function assertCheckedIn(response: { status: number; body: unknown }) {
  // Trakt answers `201 Created` when a check-in starts; the contract documents `200`. Both are success.
  if (response.status === 200 || response.status === 201) return;

  if (response.status === 409) {
    const { expires_at } = TraktCheckinConflictSchema.parse(response.body);
    throw new Error(`Another check-in is active until ${new Date(expires_at).toLocaleTimeString()}. Stop it first.`);
  }

  throw new Error(`Trakt refused the check-in (HTTP ${response.status}${describeBody(response.body)})`);
}

/** `POST /checkin`: shows as "watching" on Trakt, then turns into a watch once the runtime has elapsed. */
export async function checkInEpisode(traktClient: TraktClient, episodeTraktId: number, { signal }: MutationOptions) {
  assertCheckedIn(
    await traktClient.shows.startEpisodeCheckin({
      body: { episode: { ids: { trakt: episodeTraktId } }, sharing: TraktNoSharing },
      fetchOptions: { signal },
    }),
  );
}

export async function checkInMovie(traktClient: TraktClient, movieTraktId: number, { signal }: MutationOptions) {
  assertCheckedIn(
    await traktClient.movies.startMovieCheckin({
      body: { movie: { ids: { trakt: movieTraktId } }, sharing: TraktNoSharing },
      fetchOptions: { signal },
    }),
  );
}

/** `DELETE /checkin`: cancels any active check-in. */
export async function cancelCheckin(traktClient: TraktClient, { signal }: MutationOptions) {
  const response = await traktClient.shows.cancelCheckin({ fetchOptions: { signal } });
  if (response.status !== 204) {
    throw new Error(`Trakt could not stop the check-in (HTTP ${response.status}${describeBody(response.body)})`);
  }
}

/** Marks every episode of a show as watched. `"released"` is documented for episodes only, so callers avoid it. */
export async function markShowWatched(
  traktClient: TraktClient,
  showTraktId: number,
  { signal, watchedAt }: WatchOptions,
) {
  const response = await traktClient.shows.addShowToHistory({
    body: { shows: [{ ids: { trakt: showTraktId }, watched_at: watchedAt ?? new Date().toISOString() }] },
    fetchOptions: { signal },
  });

  assertHistoryAdded(response, "episodes");
}

export async function markFirstEpisodeWatched(
  traktClient: TraktClient,
  showTraktId: number,
  { signal }: MutationOptions,
) {
  const response = await traktClient.shows.getEpisode({
    params: {
      showid: showTraktId,
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

  await markEpisodeWatched(traktClient, response.body.ids.trakt, { signal });
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

/** Rates a title and checks Trakt stored it: a 2xx with nothing added (or updated) is a failure. */
export async function rateTitle(
  traktClient: TraktClient,
  type: "movie" | "show" | "episode",
  traktId: number,
  rating: number,
  options: MutationOptions,
) {
  const response = await rateMedia(traktClient, { type, traktId, rating }, options);
  const write = readSyncWrite(response.body, syncKindForMedia(type));
  if ((response.status !== 200 && response.status !== 201) || write.added + write.existing === 0) {
    throw new Error(`Trakt did not store the rating (HTTP ${response.status}). Try again.`);
  }
}

/** Removes a rating and checks Trakt deleted one: nothing deleted means there was no rating to remove. */
export async function unrateTitle(
  traktClient: TraktClient,
  type: "movie" | "show" | "episode",
  traktId: number,
  options: MutationOptions,
) {
  const response = await removeMediaRating(traktClient, { type, traktId }, options);
  const write = readSyncWrite(response.body, syncKindForMedia(type));
  if (response.status !== 200 || write.deleted === 0) {
    throw new Error("Trakt had no rating to remove for this title.");
  }
}

/**
 * Removes every play of a movie, a whole show or one episode, and returns how many plays Trakt deleted.
 * Nothing deleted means the title had no play: that is reported, not shown as a success.
 */
export async function removeTitleFromHistory(
  traktClient: TraktClient,
  type: "movie" | "show" | "episode",
  traktId: number,
  options: MutationOptions,
) {
  const response =
    type === "movie"
      ? await removeMovieIdFromHistory(traktClient, traktId, options)
      : type === "show"
        ? await removeShowIdFromHistory(traktClient, traktId, options)
        : await removeEpisodeIdFromHistory(traktClient, traktId, options);
  // History deletes are counted in episodes for a show: its plays are episode plays.
  const write = readSyncWrite(response.body, type === "movie" ? "movies" : "episodes");
  if (response.status !== 200 || write.deleted === 0) {
    throw new Error("Trakt found no plays to remove for this title.");
  }
  return write.deleted;
}

export type ActiveCheckin = {
  type: "movie" | "episode";
  traktId: number;
  title: string;
  expiresAt: string;
};

/** What the user is checked in to right now, or `null`. Trakt answers `204` with no body when nothing is. */
export async function fetchActiveCheckin(
  traktClient: TraktClient,
  { signal }: MutationOptions,
): Promise<ActiveCheckin | null> {
  const response = await traktClient.users.getWatching({ params: { id: "me" }, fetchOptions: { signal } });
  if (response.status === 204) return null;

  const { type, expires_at, movie, episode, show } = response.body;
  const item = type === "movie" ? movie : episode;
  if (!item) return null;

  const title = type === "movie" ? (movie?.title ?? "") : [show?.title, episode?.title].filter(Boolean).join(" · ");
  return { type, traktId: item.ids.trakt, title, expiresAt: expires_at };
}
