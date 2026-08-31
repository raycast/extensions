import { NodeHtmlMarkdown } from "node-html-markdown";
import type { Movie, MovieDetails } from "./types";

const LETTERBOXD_URL_BASE = "https://letterboxd.com";

export interface SearchMoviesToolResult {
  query: string;
  count: number;
  results: Array<{
    id: string;
    title: string;
    releaseYear?: number;
    director?: string;
    rating?: number;
    runtimeMinutes?: number;
    genres: string[];
    top250Position?: number;
    detailsPath: string;
    letterboxdUrl: string;
    imdbUrl?: string;
    tmdbUrl?: string;
  }>;
}

export interface MovieDetailsToolResult {
  id: string;
  title: string;
  director?: string;
  releaseYear?: number;
  releaseDate?: string;
  runtimeMinutes?: number;
  rating?: { average: number; count: number };
  genres: string[];
  languages: string[];
  countries: string[];
  description?: string;
  cast: Array<{ name: string; url?: string }>;
  productionCompanies: Array<{ name: string; url?: string }>;
  reviews: Array<{
    reviewer?: string;
    rating?: string;
    commentCount?: number;
    excerpt?: string;
    url?: string;
  }>;
  letterboxdUrl: string;
}

export function clampToolLimit(
  limit: number | undefined,
  fallback: number,
  maximum: number,
  minimum = 1,
): number {
  if (limit === undefined || !Number.isFinite(limit)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(limit)));
}

export function normalizeFilmPath(value: string): string {
  const url = new URL(value.trim(), LETTERBOXD_URL_BASE);
  if (
    url.origin !== LETTERBOXD_URL_BASE ||
    !/^\/film\/[^/]+\/?$/.test(url.pathname)
  ) {
    throw new Error(
      "filmPath must be a Letterboxd film path or letterboxd.com film URL returned by search-movies",
    );
  }
  return url.pathname;
}

export function toSearchMoviesToolResult(
  query: string,
  movies: Movie[],
  limit: number,
): SearchMoviesToolResult {
  const results = movies.slice(0, limit).map((movie) => ({
    id: movie.id,
    title: movie.title,
    releaseYear: movie.released ? Number.parseInt(movie.released) : undefined,
    director: movie.director || undefined,
    rating: movie.rating,
    runtimeMinutes: movie.runtime,
    genres: movie.genres ?? [],
    top250Position: movie.top250Position,
    detailsPath: movie.detailsPage,
    letterboxdUrl: movie.links.letterboxd,
    imdbUrl: movie.links.imdb,
    tmdbUrl: movie.links.tmdb,
  }));

  return { query, count: results.length, results };
}

export function toMovieDetailsToolResult(
  details: MovieDetails,
  castLimit: number,
  reviewLimit: number,
): MovieDetailsToolResult {
  const description = NodeHtmlMarkdown.translate(details.description).trim();
  return {
    id: details.id,
    title: details.title,
    director: details.director || undefined,
    releaseYear: details.released
      ? Number.parseInt(details.released)
      : undefined,
    releaseDate: details.releaseDate,
    runtimeMinutes: details.runtime,
    rating: details.ratingHistogram?.rating,
    genres: details.genres ?? [],
    languages: details.languages ?? [],
    countries: details.countries ?? [],
    description: description || undefined,
    cast: (details.cast ?? []).slice(0, castLimit),
    productionCompanies: details.productionCompanies ?? [],
    reviews: (details.reviews ?? []).slice(0, reviewLimit).map((review) => ({
      reviewer: review.reviewerName,
      rating: review.rating,
      commentCount: review.commentCount,
      excerpt: review.reviewBody,
      url: review.reviewUrl
        ? new URL(review.reviewUrl, LETTERBOXD_URL_BASE).toString()
        : undefined,
    })),
    letterboxdUrl: details.url,
  };
}
