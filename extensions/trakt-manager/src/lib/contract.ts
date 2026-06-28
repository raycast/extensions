import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  TraktEpisodeList,
  TraktEpisodeListItem,
  TraktExtendedSchema,
  TraktIdSchema,
  TraktIdSchemaWithTime,
  TraktMovieHistoryList,
  TraktMovieList,
  TraktMovieRecommendationList,
  TraktPaginationWithSortingSchema,
  TraktRecommendationRequestSchema,
  TraktSearchSchema,
  TraktSeasonList,
  TraktShowHistoryList,
  TraktShowList,
  TraktShowRecommendationList,
  TraktUpNextQuerySchema,
} from "./schema";

const c = initContract();

const TraktMovieContract = c.router({
  searchMovies: {
    method: "GET",
    path: "/search/movie",
    responses: {
      200: TraktMovieList,
    },
    query: TraktSearchSchema,
    summary: "Search for movies",
  },
  getWatchlistMovies: {
    method: "GET",
    path: "/sync/watchlist/movies/added",
    responses: {
      200: TraktMovieList,
    },
    query: TraktPaginationWithSortingSchema,
    summary: "Get movies in watchlist",
  },
  getRecommendedMovies: {
    method: "GET",
    path: "/recommendations/movies",
    responses: {
      200: TraktMovieRecommendationList,
    },
    query: TraktRecommendationRequestSchema,
    summary: "Get recommended movies",
  },
  addMovieToWatchlist: {
    method: "POST",
    path: "/sync/watchlist",
    responses: {
      201: z.unknown(),
    },
    body: z.object({
      movies: z.array(TraktIdSchema),
    }),
    summary: "Add movie to watchlist",
  },
  removeMovieFromWatchlist: {
    method: "POST",
    path: "/sync/watchlist/remove",
    responses: {
      200: z.unknown(),
    },
    body: z.object({
      movies: z.array(TraktIdSchema),
    }),
    summary: "Remove movie from watchlist",
  },
  // The new Trakt API still doesn't have the check-in endpoint
  // Falling back to the history endpoint
  checkInMovie: {
    method: "POST",
    path: "/sync/history",
    responses: {
      200: z.unknown(),
    },
    body: z.object({
      movies: z.array(TraktIdSchemaWithTime),
    }),
    summary: "Check-in movie",
  },
  addMovieToHistory: {
    method: "POST",
    path: "/sync/history",
    responses: {
      200: z.unknown(),
    },
    body: z.object({
      movies: z.array(TraktIdSchemaWithTime),
    }),
    summary: "Add movie to history",
  },
  getMovieHistory: {
    method: "GET",
    path: "/sync/history/movies",
    responses: {
      200: TraktMovieHistoryList,
    },
    query: TraktPaginationWithSortingSchema,
    summary: "Get movie history",
  },
  removeMovieFromHistory: {
    method: "POST",
    path: "/sync/history/remove",
    responses: {
      201: z.unknown(),
    },
    body: z.object({
      movies: z.array(TraktIdSchema),
    }),
    summary: "Remove movie from history",
  },
});

const TraktShowContract = c.router({
  searchShows: {
    method: "GET",
    path: "/search/show",
    responses: {
      200: TraktShowList,
    },
    query: TraktSearchSchema,
    summary: "Search for shows",
  },
  searchEpisodes: {
    method: "GET",
    path: "/search/episode",
    responses: {
      200: TraktShowHistoryList,
    },
    query: TraktSearchSchema,
    summary: "Search for episodes",
  },
  getWatchlistShows: {
    method: "GET",
    path: "/sync/watchlist/shows/added",
    responses: {
      200: TraktShowList,
    },
    query: TraktPaginationWithSortingSchema,
    summary: "Get shows in watchlist",
  },
  getRecommendedShows: {
    method: "GET",
    path: "/recommendations/shows",
    responses: {
      200: TraktShowRecommendationList,
    },
    query: TraktRecommendationRequestSchema,
    summary: "Get recommended shows",
  },
  addShowToWatchlist: {
    method: "POST",
    path: "/sync/watchlist",
    responses: {
      201: z.unknown(),
    },
    body: z.object({
      shows: z.array(TraktIdSchema),
    }),
    summary: "Add show to watchlist",
  },
  removeShowFromWatchlist: {
    method: "POST",
    path: "/sync/watchlist/remove",
    responses: {
      200: z.unknown(),
    },
    body: z.object({
      shows: z.array(TraktIdSchema),
    }),
    summary: "Remove show from watchlist",
  },
  addShowToHistory: {
    method: "POST",
    path: "/sync/history",
    responses: {
      201: z.unknown(),
    },
    body: z.object({
      shows: z.array(TraktIdSchemaWithTime),
    }),
    summary: "Add show to history",
  },
  // The new Trakt API still doesn't have the check-in endpoint
  // Falling back to the history endpoint
  checkInEpisode: {
    method: "POST",
    path: "/sync/history",
    responses: {
      200: z.unknown(),
    },
    body: z.object({
      episodes: z.array(TraktIdSchemaWithTime),
    }),
    summary: "Check-in episode",
  },
  addEpisodeToHistory: {
    method: "POST",
    path: "/sync/history",
    responses: {
      201: z.unknown(),
    },
    body: z.object({
      episodes: z.array(TraktIdSchemaWithTime),
    }),
    summary: "Add episode to history",
  },
  getShowHistory: {
    method: "GET",
    path: "/sync/history/shows",
    responses: {
      200: TraktShowHistoryList,
    },
    query: TraktPaginationWithSortingSchema,
    summary: "Get show history",
  },
  removeShowFromHistory: {
    method: "POST",
    path: "/sync/history/remove",
    responses: {
      200: z.unknown(),
    },
    body: z.object({
      shows: z.array(TraktIdSchema),
    }),
    summary: "Remove show from history",
  },
  removeEpisodeFromHistory: {
    method: "POST",
    path: "/sync/history/remove",
    responses: {
      200: z.unknown(),
    },
    body: z.object({
      episodes: z.array(TraktIdSchema),
    }),
    summary: "Remove episode from history",
  },
  getEpisodes: {
    method: "GET",
    path: "/shows/:showid/seasons/:seasonNumber/episodes",
    responses: {
      200: TraktEpisodeList,
    },
    pathParams: z.object({
      showid: z.coerce.number(),
      seasonNumber: z.coerce.number(),
    }),
    query: TraktExtendedSchema,
    summary: "Get episodes for a season",
  },
  getEpisode: {
    method: "GET",
    path: "/shows/:showid/seasons/:seasonNumber/episodes/:episodeNumber",
    responses: {
      200: TraktEpisodeListItem,
    },
    pathParams: z.object({
      showid: z.coerce.number(),
      seasonNumber: z.coerce.number(),
      episodeNumber: z.coerce.number(),
    }),
    query: TraktExtendedSchema,
    summary: "Get episodes for a season",
  },
  getSeasons: {
    method: "GET",
    path: "/shows/:showid/seasons",
    responses: {
      200: TraktSeasonList,
    },
    pathParams: z.object({
      showid: z.coerce.number(),
    }),
    query: TraktExtendedSchema,
    summary: "Get seasons for a show",
  },
  getUpNextShows: {
    method: "GET",
    path: "/sync/progress/up_next",
    responses: {
      200: TraktShowList,
    },
    query: TraktUpNextQuerySchema,
    summary: "Get up next shows",
  },
  addSeasonToHistory: {
    method: "POST",
    path: "/sync/history",
    responses: {
      201: z.unknown(),
    },
    body: z.object({
      seasons: z.array(TraktIdSchemaWithTime),
    }),
    summary: "Add season to history",
  },
});

export const TraktContract = c.router(
  {
    movies: TraktMovieContract,
    shows: TraktShowContract,
  },
  {
    strictStatusCodes: true,
  },
);
