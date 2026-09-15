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
  TraktHistoryQuerySchema,
  TraktPaginationWithSortingSchema,
  TraktRecommendationRequestSchema,
  TraktSearchSchema,
  TraktSeasonList,
  TraktShowHistoryList,
  TraktShowList,
  TraktShowRecommendationList,
  TraktShowDetailedProgressSchema,
  TraktShowProgressQuerySchema,
  TraktRatingItemSchema,
  TraktUpNextQuerySchema,
  TraktPaginationSchema,
  TraktUserRatingListSchema,
  TraktUserStatsSchema,
  TraktListSchema,
  TraktListsSchema,
  TraktListEntriesSchema,
  TraktListItemIdSchema,
  TraktListItemsUpdateSchema,
  TraktListPrivacySchema,
  TraktIdLookupQuerySchema,
  TraktIdLookupSchema,
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
    query: TraktHistoryQuerySchema,
    summary: "Get movie history",
  },
  getMovieHistoryForItem: {
    method: "GET",
    path: "/sync/history/movies/:id",
    responses: {
      200: TraktMovieHistoryList,
    },
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    query: TraktHistoryQuerySchema.partial(),
    summary: "Get the complete watch history for one specific movie",
  },
  removeMovieFromHistory: {
    method: "POST",
    path: "/sync/history/remove",
    responses: {
      200: z.unknown(),
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
    query: TraktHistoryQuerySchema,
    summary: "Get show history",
  },
  getShowHistoryForItem: {
    method: "GET",
    path: "/sync/history/shows/:id",
    responses: {
      200: TraktShowHistoryList,
    },
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    query: TraktHistoryQuerySchema.partial(),
    summary: "Get the complete watch history for one specific show",
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
  getShowProgress: {
    method: "GET",
    path: "/shows/:showid/progress/watched",
    responses: {
      200: TraktShowDetailedProgressSchema,
    },
    pathParams: z.object({
      showid: z.coerce.number(),
    }),
    query: TraktShowProgressQuerySchema,
    summary: "Get watched progress for a show",
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

const TraktSyncContract = c.router({
  addRatings: {
    method: "POST",
    path: "/sync/ratings",
    responses: {
      200: z.unknown(),
      201: z.unknown(),
    },
    body: z.object({
      movies: z.array(TraktRatingItemSchema).optional(),
      shows: z.array(TraktRatingItemSchema).optional(),
      seasons: z.array(TraktRatingItemSchema).optional(),
      episodes: z.array(TraktRatingItemSchema).optional(),
    }),
    summary: "Add ratings for movies, shows, seasons, or episodes",
  },
  removeRatings: {
    method: "POST",
    path: "/sync/ratings/remove",
    responses: {
      200: z.unknown(),
    },
    body: z.object({
      movies: z.array(TraktIdSchema).optional(),
      shows: z.array(TraktIdSchema).optional(),
      seasons: z.array(TraktIdSchema).optional(),
      episodes: z.array(TraktIdSchema).optional(),
    }),
    summary: "Remove ratings",
  },
  getRatings: {
    method: "GET",
    path: "/sync/ratings/:type",
    responses: {
      200: TraktUserRatingListSchema,
    },
    pathParams: z.object({
      type: z.enum(["movies", "shows", "seasons", "episodes", "all"]),
    }),
    query: TraktPaginationSchema.partial().merge(TraktExtendedSchema.partial()),
    summary: "Get user ratings",
  },
  getRatingsByRating: {
    method: "GET",
    path: "/sync/ratings/:type/:rating",
    responses: {
      200: TraktUserRatingListSchema,
    },
    pathParams: z.object({
      type: z.enum(["movies", "shows", "seasons", "episodes", "all"]),
      rating: z.coerce.number(),
    }),
    query: TraktPaginationSchema.partial().merge(TraktExtendedSchema.partial()),
    summary: "Get user ratings filtered by rating score",
  },
});

const TraktUserContract = c.router({
  getUserStats: {
    method: "GET",
    path: "/users/:id/stats",
    responses: {
      200: TraktUserStatsSchema,
    },
    pathParams: z.object({
      id: z.string().default("me"),
    }),
    summary: "Get user stats",
  },
  getLists: {
    method: "GET",
    path: "/users/:id/lists",
    responses: {
      200: TraktListsSchema,
    },
    pathParams: z.object({
      id: z.string().default("me"),
    }),
    summary: "Get personal lists",
  },
  createList: {
    method: "POST",
    path: "/users/:id/lists",
    responses: {
      200: TraktListSchema,
      201: TraktListSchema,
    },
    pathParams: z.object({
      id: z.string().default("me"),
    }),
    body: z.object({
      name: z.string(),
      description: z.string().optional(),
      privacy: TraktListPrivacySchema.optional(),
      display_numbers: z.boolean().optional(),
      allow_comments: z.boolean().optional(),
      sort_by: z.string().optional(),
      sort_how: z.string().optional(),
    }),
    summary: "Create a personal list",
  },
  getListItems: {
    method: "GET",
    path: "/users/:id/lists/:listId/items",
    responses: {
      200: TraktListEntriesSchema,
    },
    pathParams: z.object({
      id: z.string().default("me"),
      listId: z.string(),
    }),
    query: TraktExtendedSchema.partial(),
    summary: "Get items on a personal list",
  },
  addListItems: {
    method: "POST",
    path: "/users/:id/lists/:listId/items",
    responses: {
      200: TraktListItemsUpdateSchema,
      201: TraktListItemsUpdateSchema,
    },
    pathParams: z.object({
      id: z.string().default("me"),
      listId: z.string(),
    }),
    body: z.object({
      movies: z.array(TraktListItemIdSchema).optional(),
      shows: z.array(TraktListItemIdSchema).optional(),
      seasons: z.array(TraktListItemIdSchema).optional(),
      episodes: z.array(TraktListItemIdSchema).optional(),
    }),
    summary: "Add items to a personal list",
  },
  removeListItems: {
    method: "POST",
    path: "/users/:id/lists/:listId/items/remove",
    responses: {
      200: TraktListItemsUpdateSchema,
      201: TraktListItemsUpdateSchema,
    },
    pathParams: z.object({
      id: z.string().default("me"),
      listId: z.string(),
    }),
    body: z.object({
      movies: z.array(TraktListItemIdSchema).optional(),
      shows: z.array(TraktListItemIdSchema).optional(),
      seasons: z.array(TraktListItemIdSchema).optional(),
      episodes: z.array(TraktListItemIdSchema).optional(),
    }),
    summary: "Remove items from a personal list",
  },
});

const TraktSearchContract = c.router({
  lookupById: {
    method: "GET",
    path: "/search/trakt/:id",
    responses: {
      200: TraktIdLookupSchema,
    },
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    query: TraktIdLookupQuerySchema,
    summary: "Look up a movie, show, season or episode by its Trakt ID",
  },
});

export const TraktContract = c.router(
  {
    movies: TraktMovieContract,
    shows: TraktShowContract,
    sync: TraktSyncContract,
    users: TraktUserContract,
    search: TraktSearchContract,
  },
  {
    strictStatusCodes: true,
  },
);
