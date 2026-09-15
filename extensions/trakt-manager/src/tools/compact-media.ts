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
  name: string;
  description?: string;
  privacy?: string;
  itemCount: number;
  displayNumbers?: boolean;
  updatedAt?: string;
};

export type CompactListEntry = {
  listEntryId: number;
  rank?: number;
  type: string;
  title: string;
  year?: number;
  traktId: number;
  episodeLabel?: string;
  notes?: string;
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
  return {
    traktId: list.ids.trakt,
    slug: list.ids.slug ?? undefined,
    name: list.name,
    description: truncateOverview(list.description ?? undefined),
    privacy: list.privacy,
    itemCount: list.item_count ?? 0,
    displayNumbers: list.display_numbers,
    updatedAt: list.updated_at,
  };
}

export function toCompactListEntry(entry: TraktListEntry): CompactListEntry {
  const pad = (n: number) => n.toString().padStart(2, "0");

  let title = "Unknown";
  let traktId = 0;
  let year: number | undefined;
  let episodeLabel: string | undefined;

  if (entry.movie) {
    title = entry.movie.title;
    traktId = entry.movie.ids.trakt;
    year = entry.movie.year ?? undefined;
  } else if (entry.episode) {
    title = entry.show
      ? `${entry.show.title}: ${entry.episode.title ?? "Episode"}`
      : (entry.episode.title ?? "Episode");
    traktId = entry.episode.ids.trakt;
    episodeLabel = `S${pad(entry.episode.season)}E${pad(entry.episode.number)}`;
  } else if (entry.season) {
    title = entry.show ? `${entry.show.title} (Season ${entry.season.number})` : `Season ${entry.season.number}`;
    traktId = entry.season.ids?.trakt ?? 0;
  } else if (entry.show) {
    title = entry.show.title;
    traktId = entry.show.ids.trakt;
    year = entry.show.year ?? undefined;
  } else if (entry.person) {
    title = entry.person.name;
    traktId = entry.person.ids.trakt;
  }

  return {
    listEntryId: entry.id,
    rank: entry.rank ?? undefined,
    type: entry.type,
    title,
    year,
    traktId,
    episodeLabel,
    notes: entry.notes ?? undefined,
  };
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
