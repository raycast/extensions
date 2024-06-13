import fetch from "node-fetch";
import { TRAKT_API_URL, TRAKT_CLIENT_ID } from "../lib/constants";
import { oauthClient } from "../lib/oauth";

export const searchMovies = async (query: string, page: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(
    `${TRAKT_API_URL}/search/movie?query=${encodeURIComponent(query)}&page=${page}&limit=10&fields=title`,
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "trakt-api-version": "2",
        "trakt-api-key": TRAKT_CLIENT_ID,
        Authorization: `Bearer ${tokens?.accessToken}`,
      },
      signal,
    },
  );

  const result = (await response.json()) as TraktMovieList;
  result.page = Number(response.headers.get("X-Pagination-Page")) ?? 1;
  result.total_pages = Number(response.headers.get("X-Pagination-Page-Count")) ?? 1;
  result.total_results = Number(response.headers.get("X-Pagination-Item-Count")) ?? result.length;

  return result;
};

export const getWatchlistMovies = async (page: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/sync/watchlist/movies/added?page=${page}&limit=10&fields=title`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const result = (await response.json()) as TraktMovieList;
  result.page = Number(response.headers.get("X-Pagination-Page")) ?? 1;
  result.total_pages = Number(response.headers.get("X-Pagination-Page-Count")) ?? 1;
  result.total_results = Number(response.headers.get("X-Pagination-Item-Count")) ?? result.length;

  return result;
};

export const addMovieToWatchlist = async (movieId: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/sync/watchlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({
      movies: [
        {
          ids: {
            trakt: movieId,
          },
        },
      ],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
};

export const removeMovieFromWatchlist = async (movieId: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/sync/watchlist/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({
      movies: [
        {
          ids: {
            trakt: movieId,
          },
        },
      ],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
};

export const checkInMovie = async (movieId: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/checkin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({
      movie: {
        ids: {
          trakt: movieId,
        },
      },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
};
