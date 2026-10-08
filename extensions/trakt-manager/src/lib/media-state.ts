export type RatedType = "movie" | "show" | "episode";

/** The user's ratings by Trakt id, as JSON-friendly pairs so they survive the cached state. */
export type RatingIndex = { movies: [number, number][]; shows: [number, number][]; episodes: [number, number][] };

type RatingEntry = {
  rating: number;
  movie?: { ids: { trakt: number } };
  show?: { ids: { trakt: number } };
  episode?: { ids: { trakt: number } };
};

const ratingKey = { movie: "movies", show: "shows", episode: "episodes" } as const;

/** Builds the rating index from `/sync/ratings/{movies,shows,episodes}` pages. */
export function toRatingIndex(movies: RatingEntry[], shows: RatingEntry[], episodes: RatingEntry[]): RatingIndex {
  const pairs = (entries: RatingEntry[], pick: (entry: RatingEntry) => number | undefined) =>
    entries.flatMap((entry): [number, number][] => {
      const id = pick(entry);
      return id === undefined ? [] : [[id, entry.rating]];
    });

  return {
    movies: pairs(movies, (entry) => entry.movie?.ids.trakt),
    shows: pairs(shows, (entry) => entry.show?.ids.trakt),
    episodes: pairs(episodes, (entry) => entry.episode?.ids.trakt),
  };
}

export function ratingOf(index: RatingIndex, type: RatedType, traktId: number) {
  return index[ratingKey[type]].find(([id]) => id === traktId)?.[1];
}

/** Sets or, with `undefined`, removes one rating. */
export function withRating(index: RatingIndex, type: RatedType, traktId: number, rating: number | undefined) {
  const key = ratingKey[type];
  const others = index[key].filter(([id]) => id !== traktId);
  return { ...index, [key]: rating === undefined ? others : [...others, [traktId, rating]] };
}

/**
 * What the user has watched. Episodes are keyed `showId:season:number`, because `/sync/watched/shows`
 * lists them by number, without their own Trakt id.
 */
export type WatchedIndex = { movies: number[]; shows: number[]; episodes: string[] };

type WatchedMovie = { plays: number; movie: { ids: { trakt: number } } };
type WatchedShow = {
  plays: number;
  show: { ids: { trakt: number } };
  seasons?: { number: number; episodes: { number: number; plays: number }[] }[];
};

export const episodeKey = (showId: number, season: number, number: number) => `${showId}:${season}:${number}`;

export function toWatchedIndex(movies: WatchedMovie[], shows: WatchedShow[]): WatchedIndex {
  return {
    movies: movies.filter((entry) => entry.plays > 0).map((entry) => entry.movie.ids.trakt),
    shows: shows.filter((entry) => entry.plays > 0).map((entry) => entry.show.ids.trakt),
    episodes: shows.flatMap((entry) =>
      (entry.seasons ?? []).flatMap((season) =>
        season.episodes
          .filter((episode) => episode.plays > 0)
          .map((episode) => episodeKey(entry.show.ids.trakt, season.number, episode.number)),
      ),
    ),
  };
}

export type WatchedTarget =
  | { type: "movie"; traktId: number }
  | { type: "show"; traktId: number }
  | { type: "episode"; showId: number; season: number; number: number };

export function isWatched(index: WatchedIndex, target: WatchedTarget) {
  if (target.type === "movie") return index.movies.includes(target.traktId);
  if (target.type === "show") return index.shows.includes(target.traktId);
  return index.episodes.includes(episodeKey(target.showId, target.season, target.number));
}

/**
 * Marks a title watched or not. Removing a show from history removes every episode play, so its episodes
 * go too; marking one episode watched makes its show watched.
 */
export function withWatched(index: WatchedIndex, target: WatchedTarget, watched: boolean): WatchedIndex {
  const toggle = <T>(list: T[], value: T) =>
    watched ? [...list.filter((v) => v !== value), value] : list.filter((v) => v !== value);

  if (target.type === "movie") return { ...index, movies: toggle(index.movies, target.traktId) };

  if (target.type === "show") {
    const episodes = watched ? index.episodes : index.episodes.filter((key) => !key.startsWith(`${target.traktId}:`));
    return { ...index, shows: toggle(index.shows, target.traktId), episodes };
  }

  const key = episodeKey(target.showId, target.season, target.number);
  const episodes = toggle(index.episodes, key);
  const shows = watched
    ? toggle(index.shows, target.showId)
    : episodes.some((other) => other.startsWith(`${target.showId}:`))
      ? index.shows
      : index.shows.filter((id) => id !== target.showId);
  return { ...index, episodes, shows };
}
