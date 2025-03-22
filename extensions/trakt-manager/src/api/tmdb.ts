import { LocalStorage } from "@raycast/api";
import fetch from "node-fetch";
import { TMDB_API_URL, TMDB_BEARER_TOKEN } from "../lib/constants";

export const getTMDBMovieDetails = async (tmdbId: number, signal: AbortSignal | undefined) => {
  const cache = await LocalStorage.getItem<string>(`movie_${tmdbId}`);
  if (cache) {
    const movie = JSON.parse(cache) as TMDBMovieDetails;
    return movie;
  }

  const url = `${TMDB_API_URL}/movie/${tmdbId}`;
  console.log(url);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
    },
    signal,
  });

  if (!response.ok) {
    console.error("getTMDBMovieDetails:", await response.text());
    return;
  }

  const movie = (await response.json()) as TMDBMovieDetails;
  await LocalStorage.setItem(`movie_${tmdbId}`, JSON.stringify(movie));
  return movie;
};

export const getTMDBShowDetails = async (tmdbId: number, signal: AbortSignal | undefined) => {
  const cache = await LocalStorage.getItem<string>(`show_${tmdbId}`);
  if (cache) {
    const show = JSON.parse(cache) as TMDBShowDetails;
    return show;
  }

  const url = `${TMDB_API_URL}/tv/${tmdbId}`;
  console.log(url);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
    },
    signal,
  });

  if (!response.ok) {
    console.error("getTMDBShowDetails:", await response.text());
    return;
  }

  const show = (await response.json()) as TMDBShowDetails;
  await LocalStorage.setItem(`show_${tmdbId}`, JSON.stringify(show));
  return show;
};

export const getTMDBSeasonDetails = async (tmdbId: number, seasonNumber: number, signal: AbortSignal | undefined) => {
  const cache = await LocalStorage.getItem<string>(`season_${tmdbId}_${seasonNumber}`);
  if (cache) {
    const season = JSON.parse(cache) as TMDBSeasonDetails;
    return season;
  }

  const url = `${TMDB_API_URL}/tv/${tmdbId}/season/${seasonNumber}`;
  console.log(url);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
    },
    signal,
  });

  if (!response.ok) {
    console.error("getTMDBSeasonDetails:", await response.text());
    return;
  }

  const season = (await response.json()) as TMDBSeasonDetails;
  await LocalStorage.setItem(`season_${tmdbId}_${seasonNumber}`, JSON.stringify(season));
  return season;
};

export const getTMDBEpisodeDetails = async (
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
  signal: AbortSignal | undefined,
) => {
  const cache = await LocalStorage.getItem<string>(`episode_${tmdbId}_${seasonNumber}_${episodeNumber}`);
  if (cache) {
    const episode = JSON.parse(cache) as TMDBEpisodeDetails;
    return episode;
  }

  const url = `${TMDB_API_URL}/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`;
  console.log(url);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
    },
    signal,
  });

  if (!response.ok) {
    console.error("getTMDBSeasonDetails:", await response.text());
    return;
  }

  const episode = (await response.json()) as TMDBEpisodeDetails;
  await LocalStorage.setItem(`episode_${tmdbId}_${seasonNumber}_${episodeNumber}`, JSON.stringify(episode));
  return episode;
};
