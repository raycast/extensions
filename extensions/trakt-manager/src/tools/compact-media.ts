import {
  TraktEpisodeListItem,
  TraktList,
  TraktListEntry,
  TraktMovieBaseItem,
  TraktMovieHistoryListItem,
  TraktMovieListItem,
  TraktShowBaseItem,
  TraktShowHistoryListItem,
  TraktShowListItem,
  TraktUserRatingItem,
  TraktUserStats,
} from "../lib/schema";

export type CompactMovie = {
  traktId: number;
  title: string;
  year?: number;
  rating?: number;
  genres?: string[];
  overview?: string;
  released?: string;
  runtimeMinutes?: number;
  slug?: string;
  imdbId?: string;
};

export type CompactShow = {
  traktId: number;
  title: string;
  year?: number;
  genres?: string[];
  network?: string;
  slug?: string;
  imdbId?: string;
};

export type CompactUpNextItem = {
  showTitle: string;
  showTraktId: number;
  nextEpisode: {
    traktId: number;
    season: number;
    number: number;
    title: string;
    firstAired?: string;
  };
  progress: {
    aired: number;
    completed: number;
  };
};

export type CompactEpisode = {
  traktId: number;
  season: number;
  number: number;
  title: string;
  rating?: number;
  firstAired?: string;
  runtimeMinutes?: number;
  overview?: string;
};

export type CompactHistoryItem = {
  historyId?: number;
  type: "movie" | "episode";
  title: string;
  year?: number;
  watchedAt?: string;
  traktId: number;
  episode?: {
    traktId: number;
    season: number;
    number: number;
    title: string;
    episodeLabel: string;
  };
};

export type CompactRatingItem = {
  type: string;
  title: string;
  year?: number;
  rating: number;
  ratedAt: string;
  traktId: number;
  episode?: {
    season: number;
    number: number;
    title?: string;
    episodeLabel: string;
  };
};

export type CompactUserStats = {
  movies: {
    watched: number;
    plays: number;
    minutes: number;
    hours: number;
    days: number;
    ratings: number;
  };
  shows: {
    watched: number;
    ratings: number;
  };
  episodes: {
    watched: number;
    plays: number;
    minutes: number;
    hours: number;
    days: number;
    ratings: number;
  };
  totalMinutesWatched: number;
  totalHoursWatched: number;
  totalDaysWatched: number;
  ratingsTotal: number;
  ratingDistribution?: { [rating: string]: number };
};

export type CompactList = {
  traktId: number;
  slug?: string;
  /** Pass this to the other list tools. */
  listId: string;
  name: string;
  description?: string;
  privacy?: string;
  itemCount: number;
  displayNumbers?: boolean;
  sortBy?: string;
  sortHow?: string;
  updatedAt?: string;
};

export type CompactListEntry = {
  listEntryId: number;
  rank?: number;
  type: "movie" | "show" | "season" | "episode" | string;
  title: string;
  /** Release year of the movie or show; the parent show's year for seasons and episodes. */
  year?: number;
  traktId: number;
  showTraktId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeLabel?: string;
};

function truncateOverview(overview?: string, maxLength = 220): string | undefined {
  if (!overview) return undefined;
  if (overview.length <= maxLength) return overview;
  return `${overview.slice(0, maxLength).trim()}...`;
}

export function toCompactMovieFromBase(movie: TraktMovieBaseItem): CompactMovie {
  return {
    traktId: movie.ids.trakt,
    title: movie.title,
    year: movie.year ?? undefined,
    rating: typeof movie.rating === "number" ? Math.round(movie.rating * 10) / 10 : undefined,
    genres: movie.genres ?? undefined,
    overview: truncateOverview(movie.overview ?? undefined),
    released: movie.released ?? undefined,
    runtimeMinutes: movie.runtime ?? undefined,
    slug: movie.ids.slug,
    imdbId: movie.ids.imdb ?? undefined,
  };
}

export function toCompactMovie(item: TraktMovieListItem): CompactMovie {
  return toCompactMovieFromBase(item.movie);
}

export function toCompactShowFromBase(show: TraktShowBaseItem): CompactShow {
  return {
    traktId: show.ids.trakt,
    title: show.title,
    year: show.year ?? undefined,
    genres: show.genres ?? undefined,
    network: show.network ?? undefined,
    slug: show.ids.slug,
    imdbId: show.ids.imdb ?? undefined,
  };
}

export function toCompactShow(item: TraktShowListItem): CompactShow {
  return toCompactShowFromBase(item.show);
}

export function toCompactUpNext(item: TraktShowListItem): CompactUpNextItem {
  const next = item.progress.next_episode;
  return {
    showTitle: item.show.title,
    showTraktId: item.show.ids.trakt,
    nextEpisode: {
      traktId: next.ids.trakt,
      season: next.season,
      number: next.number,
      title: next.title,
      firstAired: next.first_aired,
    },
    progress: {
      aired: item.progress.aired,
      completed: item.progress.completed,
    },
  };
}

export function toCompactEpisode(episode: TraktEpisodeListItem): CompactEpisode {
  return {
    traktId: episode.ids.trakt,
    season: episode.season,
    number: episode.number,
    title: episode.title,
    rating: typeof episode.rating === "number" ? Math.round(episode.rating * 10) / 10 : undefined,
    firstAired: episode.first_aired,
    runtimeMinutes: episode.runtime,
    overview: truncateOverview(episode.overview),
  };
}

export function toCompactMovieHistory(item: TraktMovieHistoryListItem): CompactHistoryItem {
  return {
    historyId: item.id,
    type: "movie",
    title: item.movie.title,
    year: item.movie.year,
    watchedAt: item.watched_at,
    traktId: item.movie.ids.trakt,
  };
}

export function toCompactShowHistory(item: TraktShowHistoryListItem): CompactHistoryItem {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const s = pad(item.episode.season);
  const e = pad(item.episode.number);
  return {
    historyId: item.id,
    type: "episode",
    title: item.show.title,
    year: item.show.year,
    watchedAt: item.watched_at,
    traktId: item.show.ids.trakt,
    episode: {
      traktId: item.episode.ids.trakt,
      season: item.episode.season,
      number: item.episode.number,
      title: item.episode.title,
      episodeLabel: `S${s}E${e}`,
    },
  };
}

export function toCompactRating(item: TraktUserRatingItem): CompactRatingItem {
  let title = "Unknown";
  let traktId = 0;
  let year: number | undefined;
  let episode: CompactRatingItem["episode"];

  if (item.type === "movie" && item.movie) {
    title = item.movie.title;
    traktId = item.movie.ids.trakt;
    year = item.movie.year;
  } else if (item.type === "show" && item.show) {
    title = item.show.title;
    traktId = item.show.ids.trakt;
    year = item.show.year;
  } else if (item.type === "episode" && item.episode) {
    title = item.show ? `${item.show.title}: ${item.episode.title ?? "Episode"}` : (item.episode.title ?? "Episode");
    traktId = item.episode.ids.trakt;
    year = item.show?.year;
    const pad = (n: number) => n.toString().padStart(2, "0");
    episode = {
      season: item.episode.season,
      number: item.episode.number,
      title: item.episode.title ?? undefined,
      episodeLabel: `S${pad(item.episode.season)}E${pad(item.episode.number)}`,
    };
  } else if (item.type === "season" && item.season) {
    title = item.show ? `${item.show.title} (Season ${item.season.number})` : `Season ${item.season.number}`;
    traktId = item.season.ids?.trakt ?? 0;
    year = item.show?.year;
  }

  return {
    type: item.type,
    title,
    year,
    rating: item.rating,
    ratedAt: item.rated_at,
    traktId,
    episode,
  };
}

export function toCompactList(list: TraktList): CompactList {
  const slug = list.ids.slug ?? undefined;
  return {
    traktId: list.ids.trakt,
    slug,
    listId: slug ?? String(list.ids.trakt),
    name: list.name,
    description: truncateOverview(list.description ?? undefined),
    privacy: list.privacy,
    itemCount: list.item_count ?? 0,
    displayNumbers: list.display_numbers,
    sortBy: list.sort_by,
    sortHow: list.sort_how,
    updatedAt: list.updated_at,
  };
}

export function toCompactListEntry(entry: TraktListEntry): CompactListEntry {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const base = { listEntryId: entry.id, rank: entry.rank ?? undefined, type: entry.type };

  if (entry.type === "movie" && entry.movie) {
    return { ...base, title: entry.movie.title, year: entry.movie.year ?? undefined, traktId: entry.movie.ids.trakt };
  }

  if (entry.type === "episode" && entry.episode) {
    const label = `S${pad(entry.episode.season)}E${pad(entry.episode.number)}`;
    return {
      ...base,
      title: entry.show
        ? `${entry.show.title}: ${entry.episode.title ?? "Episode"}`
        : (entry.episode.title ?? "Episode"),
      year: entry.show?.year ?? undefined,
      traktId: entry.episode.ids.trakt,
      showTraktId: entry.show?.ids.trakt,
      seasonNumber: entry.episode.season,
      episodeNumber: entry.episode.number,
      episodeLabel: label,
    };
  }

  if (entry.type === "season" && entry.season) {
    return {
      ...base,
      title: entry.show ? `${entry.show.title} (Season ${entry.season.number})` : `Season ${entry.season.number}`,
      year: entry.show?.year ?? undefined,
      traktId: entry.season.ids?.trakt ?? 0,
      showTraktId: entry.show?.ids.trakt,
      seasonNumber: entry.season.number,
    };
  }

  if (entry.type === "show" && entry.show) {
    return { ...base, title: entry.show.title, year: entry.show.year ?? undefined, traktId: entry.show.ids.trakt };
  }

  return { ...base, title: "Unknown", traktId: 0 };
}

export function toCompactUserStats(stats: TraktUserStats): CompactUserStats {
  const movieMinutes = stats.movies?.minutes ?? 0;
  const episodeMinutes = stats.episodes?.minutes ?? 0;
  const totalMinutes = movieMinutes + episodeMinutes;

  return {
    movies: {
      watched: stats.movies?.watched ?? 0,
      plays: stats.movies?.plays ?? 0,
      minutes: movieMinutes,
      hours: Math.round((movieMinutes / 60) * 10) / 10,
      days: Math.round((movieMinutes / (60 * 24)) * 10) / 10,
      ratings: stats.movies?.ratings ?? 0,
    },
    shows: {
      watched: stats.shows?.watched ?? 0,
      ratings: stats.shows?.ratings ?? 0,
    },
    episodes: {
      watched: stats.episodes?.watched ?? 0,
      plays: stats.episodes?.plays ?? 0,
      minutes: episodeMinutes,
      hours: Math.round((episodeMinutes / 60) * 10) / 10,
      days: Math.round((episodeMinutes / (60 * 24)) * 10) / 10,
      ratings: stats.episodes?.ratings ?? 0,
    },
    totalMinutesWatched: totalMinutes,
    totalHoursWatched: Math.round((totalMinutes / 60) * 10) / 10,
    totalDaysWatched: Math.round((totalMinutes / (60 * 24)) * 10) / 10,
    ratingsTotal: stats.ratings?.total ?? 0,
    ratingDistribution: stats.ratings?.distribution,
  };
}
