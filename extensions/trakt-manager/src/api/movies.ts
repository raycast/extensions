import fetch from "node-fetch";
import { TRAKT_API_URL, TRAKT_CLIENT_ID } from "../lib/constants";
import { oauthProvider } from "../lib/oauth";

export const searchMovies = async (query: string, page: number, signal: AbortSignal | undefined = undefined) => {
  const url = `${TRAKT_API_URL}/search/movie?query=${encodeURIComponent(query)}&page=${page}&limit=10&fields=title`;
  console.log("searchMovies:", url);

  const accessToken = await oauthProvider.authorize();
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    console.error("searchMovies:", await response.text());
    throw new Error(response.statusText);
  }

  const result = (await response.json()) as TraktMovieList;
  result.page = Number(response.headers.get("X-Pagination-Page")) ?? 1;
  result.total_pages = Number(response.headers.get("X-Pagination-Page-Count")) ?? 1;
  result.total_results = Number(response.headers.get("X-Pagination-Item-Count")) ?? result.length;

  return result;
};

export const getWatchlistMovies = async (page: number, signal: AbortSignal | undefined = undefined) => {
  const url = `${TRAKT_API_URL}/sync/watchlist/movies/added?page=${page}&limit=10`;
  console.log("getWatchlistMovies:", url);

  const accessToken = await oauthProvider.authorize();
  const response = await fetch(`${TRAKT_API_URL}/sync/watchlist/movies/added?page=${page}&limit=10`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    console.error("getWatchlistMovies:", await response.text());
    throw new Error(response.statusText);
  }

  const result = (await response.json()) as TraktMovieList;
  result.page = Number(response.headers.get("X-Pagination-Page")) ?? 1;
  result.total_pages = Number(response.headers.get("X-Pagination-Page-Count")) ?? 1;
  result.total_results = Number(response.headers.get("X-Pagination-Item-Count")) ?? result.length;

  return result;
};

export const addMovieToWatchlist = async (movieId: number, signal: AbortSignal | undefined = undefined) => {
  const url = `${TRAKT_API_URL}/sync/watchlist`;
  console.log("addMovieToWatchlist:", url);

  const accessToken = await oauthProvider.authorize();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
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
    console.error("addMovieToWatchlist:", await response.text());
    throw new Error(response.statusText);
  }
};

export const removeMovieFromWatchlist = async (movieId: number, signal: AbortSignal | undefined = undefined) => {
  const url = `${TRAKT_API_URL}/sync/watchlist/remove`;
  console.log("removeMovieFromWatchlist:", url);

  const accessToken = await oauthProvider.authorize();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
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
    console.error("removeMovieFromWatchlist:", await response.text());
    throw new Error(response.statusText);
  }
};

export const checkInMovie = async (movieId: number, signal: AbortSignal | undefined = undefined) => {
  const url = `${TRAKT_API_URL}/checkin`;
  console.log("checkInMovie:", url);

  const accessToken = await oauthProvider.authorize();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
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
    console.error("checkInMovie:", await response.text());
    throw new Error(response.statusText);
  }
};

export const addMovieToHistory = async (movieId: number, signal: AbortSignal | undefined = undefined) => {
  const url = `${TRAKT_API_URL}/sync/history`;
  console.log("addMovieToHistory:", url);

  const accessToken = await oauthProvider.authorize();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
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
    console.error("addMovieToHistory:", await response.text());
    throw new Error(response.statusText);
  }
};

export const getHistoryMovies = async (page: number, signal: AbortSignal | undefined = undefined) => {
  const url = `${TRAKT_API_URL}/sync/history/movies?page=${page}&limit=10`;
  console.log("getHistoryMovies:", url);

  const accessToken = await oauthProvider.authorize();
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    console.error("getHistoryMovies:", await response.text());
    throw new Error(response.statusText);
  }

  const result = (await response.json()) as TraktMovieList;
  result.page = Number(response.headers.get("X-Pagination-Page")) ?? 1;
  result.total_pages = Number(response.headers.get("X-Pagination-Page-Count")) ?? 1;
  result.total_results = Number(response.headers.get("X-Pagination-Item-Count")) ?? result.length;

  return result;
};

export const removeMovieFromHistory = async (movieId: number, signal: AbortSignal | undefined = undefined) => {
  const url = `${TRAKT_API_URL}/sync/history/remove`;
  console.log("removeMovieFromHistory:", url);

  const accessToken = await oauthProvider.authorize();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
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
    console.error("removeMovieFromHistory:", await response.text());
    throw new Error(response.statusText);
  }
};
