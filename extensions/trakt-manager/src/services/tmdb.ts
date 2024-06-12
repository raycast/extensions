import { LocalStorage, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { TMDB_API_URL } from "../lib/constants";

export const getTMDBMovieDetails = async (tmdbId: number, signal: AbortSignal | undefined) => {
  const tmdbMovieCache = await LocalStorage.getItem<string>(`movie_${tmdbId}`);
  if (tmdbMovieCache) {
    const tmdbMovie = JSON.parse(tmdbMovieCache) as TMDBMovieDetails;
    return tmdbMovie;
  }

  const preferences = getPreferenceValues<ExtensionPreferences>();
  if (preferences.apiKey) {
    const tmdbResponse = await fetch(`${TMDB_API_URL}/movie/${tmdbId}?api_key=${preferences.apiKey}`, {
      signal,
    });

    if (!tmdbResponse.ok) {
      return;
    }

    const tmdbMovie = (await tmdbResponse.json()) as TMDBMovieDetails;
    await LocalStorage.setItem(`movie_${tmdbId}`, JSON.stringify(tmdbMovie));
    return tmdbMovie;
  }
};

export const getTMDBShowDetails = async (tmdbId: number, signal: AbortSignal | undefined) => {
  const tmdbMovieCache = await LocalStorage.getItem<string>(`show_${tmdbId}`);
  if (tmdbMovieCache) {
    const tmdbMovie = JSON.parse(tmdbMovieCache) as TMDBShowDetails;
    return tmdbMovie;
  }

  const preferences = getPreferenceValues<ExtensionPreferences>();
  if (preferences.apiKey) {
    const tmdbResponse = await fetch(`${TMDB_API_URL}/tv/${tmdbId}?api_key=${preferences.apiKey}`, {
      signal,
    });

    if (!tmdbResponse.ok) {
      return;
    }

    const tmdbMovie = (await tmdbResponse.json()) as TMDBShowDetails;
    await LocalStorage.setItem(`show_${tmdbId}`, JSON.stringify(tmdbMovie));
    return tmdbMovie;
  }
};

export const getTMDBSeasonDetails = async (tmdbId: number, seasonNumber: number, signal: AbortSignal | undefined) => {
  const tmdbMovieCache = await LocalStorage.getItem<string>(`season_${tmdbId}_${seasonNumber}`);
  if (tmdbMovieCache) {
    const tmdbMovie = JSON.parse(tmdbMovieCache) as TMDBSeasonDetails;
    return tmdbMovie;
  }

  const preferences = getPreferenceValues<ExtensionPreferences>();
  if (preferences.apiKey) {
    const tmdbResponse = await fetch(
      `${TMDB_API_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${preferences.apiKey}`,
      {
        signal,
      },
    );

    if (!tmdbResponse.ok) {
      return;
    }

    const tmdbMovie = (await tmdbResponse.json()) as TMDBSeasonDetails;
    await LocalStorage.setItem(`season_${tmdbId}_${seasonNumber}`, JSON.stringify(tmdbMovie));
    return tmdbMovie;
  }
};

export const getTMDBEpisodeDetails = async (
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
  signal: AbortSignal | undefined,
) => {
  const tmdbMovieCache = await LocalStorage.getItem<string>(`episode_${tmdbId}_${seasonNumber}_${episodeNumber}`);
  if (tmdbMovieCache) {
    const tmdbMovie = JSON.parse(tmdbMovieCache) as TMDBEpisodeDetails;
    return tmdbMovie;
  }

  const preferences = getPreferenceValues<ExtensionPreferences>();
  if (preferences.apiKey) {
    const tmdbResponse = await fetch(
      `${TMDB_API_URL}/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${preferences.apiKey}`,
      {
        signal,
      },
    );

    if (!tmdbResponse.ok) {
      return;
    }

    const tmdbMovie = (await tmdbResponse.json()) as TMDBEpisodeDetails;
    await LocalStorage.setItem(`episode_${tmdbId}_${seasonNumber}_${episodeNumber}`, JSON.stringify(tmdbMovie));
    return tmdbMovie;
  }
};
