import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  TraktEpisodeList,
  TraktEpisodeListItem,
  TraktExtendedSchema,
  TraktIdSchema,
  TraktIdSchemaWithTime,
  TraktMovieHistoryList,
  TraktCheckinConflictSchema,
  TraktHiddenAddResponseSchema,
  TraktHistoryAddResponseSchema,
  TraktNoSharing,
  TraktWatchlistAddResponseSchema,
  TraktWatchlistRemoveResponseSchema,
  TraktMovieList,
  TraktMovieBaseList,
  TraktShowBaseList,
  TraktBrowseQuerySchema,
  TraktTrendingMovieList,
  TraktAnticipatedMovieList,
  TraktTrendingShowList,
  TraktAnticipatedShowList,
  TraktPersonSearchQuerySchema,
  TraktPersonSearchList,
  TraktPersonCreditsSchema,
  TraktPlaybackMovieList,
  TraktCalendarMovieList,
  TraktCalendarPathSchema,
  TraktCalendarShowList,
  TraktPlaybackQuerySchema,
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
  TraktUpNextNitroQuerySchema,
  TraktPaginationSchema,
  TraktUserRatingListSchema,
  TraktWatchedMovieListSchema,
  TraktWatchedShowListSchema,
  TraktUserStatsSchema,
  TraktWatchingSchema,
  TraktIdLookupQuerySchema,
  TraktIdLookupSchema,
  TraktListEntriesSchema,
  TraktListItemsBodySchema,
  TraktListSchema,
  TraktListsSchema,
  TraktListWriteBodySchema,
} from "./schema";

const TraktListPathSchema = z.object({
  id: z.string().default("me"),
  listId: z.string(),
});

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
  /**
   * Title-first search. Ranked by title equality instead of relevance, so releases that
   * share a title but little popularity surface here while the relevance-ranked search
   * above drops them. Trakt documents both as complementary: neither is a superset.
   */
  searchMoviesExact: {
    method: "GET",
    path: "/search/movie/exact",
    responses: {
      200: TraktMovieList,
    },
    query: TraktSearchSchema,
    summary: "Search for movies by exact title",
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
  dropPlayback: {
    method: "DELETE",
    path: "/sync/playback/:id",
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    body: z.undefined(),
    responses: {
      204: z.undefined(),
      404: z.unknown(),
    },
    summary: "Remove a paused playback item",
  },
  getMyCalendarMovies: {
    method: "GET",
    path: "/calendars/my/movies/:startDate/:days",
    pathParams: TraktCalendarPathSchema,
    responses: {
      200: TraktCalendarMovieList,
    },
    summary: "Get movies on the user's calendar released during a period",
  },
  getPlaybackMovies: {
    method: "GET",
    path: "/sync/playback/movies",
    responses: {
      200: TraktPlaybackMovieList,
    },
    query: TraktPlaybackQuerySchema,
    summary: "Get movies paused mid-playback",
  },
  // Paginated by default (100 per page): callers walk the pages with `X-Pagination-*`.
  getWatchlistMovieIds: {
    method: "GET",
    path: "/sync/watchlist/movies/added",
    responses: {
      200: z.array(z.object({ movie: z.object({ ids: z.object({ trakt: z.number() }) }) })),
    },
    query: TraktPaginationSchema,
    summary: "Get the Trakt ids of the movies in the watchlist",
  },
  getTrendingMovies: {
    method: "GET",
    path: "/movies/trending",
    responses: { 200: TraktTrendingMovieList },
    query: TraktBrowseQuerySchema,
    summary: "Get the movies most watched over the last 24 hours",
  },
  getPopularMovies: {
    method: "GET",
    path: "/movies/popular",
    responses: { 200: TraktMovieBaseList },
    query: TraktBrowseQuerySchema,
    summary: "Get the most popular movies",
  },
  getAnticipatedMovies: {
    method: "GET",
    path: "/movies/anticipated",
    responses: { 200: TraktAnticipatedMovieList },
    query: TraktBrowseQuerySchema,
    summary: "Get the movies on the most lists",
  },
  getRelatedMovies: {
    method: "GET",
    path: "/movies/:id/related",
    pathParams: z.object({ id: z.coerce.number() }),
    responses: {
      200: TraktMovieBaseList,
    },
    query: TraktBrowseQuerySchema,
    summary: "Get movies related to a movie",
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
  hideMovieRecommendation: {
    method: "DELETE",
    path: "/recommendations/movies/:id",
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    body: z.undefined(),
    responses: {
      204: z.undefined(),
    },
    summary: "Stop recommending a movie",
  },
  addMovieToWatchlist: {
    method: "POST",
    path: "/sync/watchlist",
    responses: {
      200: TraktWatchlistAddResponseSchema,
      201: TraktWatchlistAddResponseSchema,
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
      200: TraktWatchlistRemoveResponseSchema,
    },
    body: z.object({
      movies: z.array(TraktIdSchema),
    }),
    summary: "Remove movie from watchlist",
  },
  startMovieCheckin: {
    method: "POST",
    path: "/checkin",
    responses: {
      200: z.unknown(),
      201: z.unknown(),
      409: TraktCheckinConflictSchema,
    },
    body: z.object({
      movie: z.object({ ids: z.object({ trakt: z.number() }) }),
      sharing: z.object({ twitter: z.boolean(), mastodon: z.boolean(), tumblr: z.boolean() }).default(TraktNoSharing),
    }),
    summary: "Check in to a movie (now watching)",
  },
  addMovieToHistory: {
    method: "POST",
    path: "/sync/history",
    responses: {
      200: TraktHistoryAddResponseSchema,
      201: TraktHistoryAddResponseSchema,
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
      404: z.unknown(),
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
  searchShowsExact: {
    method: "GET",
    path: "/search/show/exact",
    responses: {
      200: TraktShowList,
    },
    query: TraktSearchSchema,
    summary: "Search for shows by exact title",
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
  getTrendingShows: {
    method: "GET",
    path: "/shows/trending",
    responses: { 200: TraktTrendingShowList },
    query: TraktBrowseQuerySchema,
    summary: "Get the shows most watched over the last 24 hours",
  },
  getPopularShows: {
    method: "GET",
    path: "/shows/popular",
    responses: { 200: TraktShowBaseList },
    query: TraktBrowseQuerySchema,
    summary: "Get the most popular shows",
  },
  getAnticipatedShows: {
    method: "GET",
    path: "/shows/anticipated",
    responses: { 200: TraktAnticipatedShowList },
    query: TraktBrowseQuerySchema,
    summary: "Get the shows on the most lists",
  },
  getRelatedShows: {
    method: "GET",
    path: "/shows/:id/related",
    pathParams: z.object({ id: z.coerce.number() }),
    responses: {
      200: TraktShowBaseList,
    },
    query: TraktBrowseQuerySchema,
    summary: "Get shows related to a show",
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
  hideShowRecommendation: {
    method: "DELETE",
    path: "/recommendations/shows/:id",
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    body: z.undefined(),
    responses: {
      204: z.undefined(),
    },
    summary: "Stop recommending a show",
  },
  addShowToWatchlist: {
    method: "POST",
    path: "/sync/watchlist",
    responses: {
      200: TraktWatchlistAddResponseSchema,
      201: TraktWatchlistAddResponseSchema,
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
      200: TraktWatchlistRemoveResponseSchema,
    },
    body: z.object({
      shows: z.array(TraktIdSchema),
    }),
    summary: "Remove show from watchlist",
  },
  // Paginated by default (100 per page): callers walk the pages with `X-Pagination-*`.
  getWatchlistShowIds: {
    method: "GET",
    path: "/sync/watchlist/shows/added",
    responses: {
      200: z.array(z.object({ show: z.object({ ids: z.object({ trakt: z.number() }) }) })),
    },
    query: TraktPaginationSchema,
    summary: "Get the Trakt ids of the shows in the watchlist",
  },
  startEpisodeCheckin: {
    method: "POST",
    path: "/checkin",
    responses: {
      200: z.unknown(),
      201: z.unknown(),
      409: TraktCheckinConflictSchema,
    },
    body: z.object({
      episode: z.object({ ids: z.object({ trakt: z.number() }) }),
      sharing: z.object({ twitter: z.boolean(), mastodon: z.boolean(), tumblr: z.boolean() }).default(TraktNoSharing),
    }),
    summary: "Check in to an episode (now watching)",
  },
  cancelCheckin: {
    method: "DELETE",
    path: "/checkin",
    body: z.undefined(),
    responses: {
      204: z.undefined(),
    },
    summary: "Cancel any active check-in",
  },
  dropShow: {
    method: "POST",
    path: "/users/hidden/dropped",
    responses: {
      200: TraktHiddenAddResponseSchema,
      201: TraktHiddenAddResponseSchema,
    },
    body: z.object({
      shows: z.array(TraktIdSchema),
    }),
    summary: "Drop a show (hides it from Continue Watching)",
  },
  hideShowFromCalendar: {
    method: "POST",
    path: "/users/hidden/calendar",
    responses: {
      200: TraktHiddenAddResponseSchema,
      201: TraktHiddenAddResponseSchema,
    },
    body: z.object({
      shows: z.array(TraktIdSchema),
    }),
    summary: "Hide a show from the calendar",
  },
  addShowToHistory: {
    method: "POST",
    path: "/sync/history",
    responses: {
      200: TraktHistoryAddResponseSchema,
      201: TraktHistoryAddResponseSchema,
    },
    body: z.object({
      shows: z.array(TraktIdSchemaWithTime),
    }),
    summary: "Add show to history",
  },
  addEpisodeToHistory: {
    method: "POST",
    path: "/sync/history",
    responses: {
      200: TraktHistoryAddResponseSchema,
      201: TraktHistoryAddResponseSchema,
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
      404: z.unknown(),
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
      404: z.unknown(),
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
  getMyCalendarShows: {
    method: "GET",
    path: "/calendars/my/shows/:startDate/:days",
    pathParams: TraktCalendarPathSchema,
    responses: {
      200: TraktCalendarShowList,
    },
    summary: "Get episodes of watched or watchlisted shows airing during a period",
  },
  getUpNextNitroShows: {
    method: "GET",
    path: "/sync/progress/up_next_nitro",
    responses: {
      200: TraktShowList,
    },
    query: TraktUpNextNitroQuerySchema,
    summary: "Get up next shows by intent",
  },
  getShowProgress: {
    method: "GET",
    path: "/shows/:showid/progress/watched",
    responses: {
      200: TraktShowDetailedProgressSchema,
      404: z.unknown(),
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
  getWatchedMovies: {
    method: "GET",
    path: "/sync/watched/movies",
    responses: {
      200: TraktWatchedMovieListSchema,
    },
    summary: "Get every movie the user has watched",
  },
  getWatchedShows: {
    method: "GET",
    path: "/sync/watched/shows",
    responses: {
      200: TraktWatchedShowListSchema,
    },
    summary: "Get every show the user has watched, with episodes by season and number",
  },
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
  getWatching: {
    method: "GET",
    path: "/users/:id/watching",
    responses: {
      200: TraktWatchingSchema,
      204: z.undefined(),
    },
    pathParams: z.object({
      id: z.string().default("me"),
    }),
    summary: "Get what the user is watching right now (an active check-in)",
  },
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
    query: TraktPaginationSchema,
    summary: "Get personal lists (paginated, limit clamped per endpoint)",
  },
  getList: {
    method: "GET",
    path: "/users/:id/lists/:listId",
    responses: {
      200: TraktListSchema,
      404: z.unknown(),
    },
    pathParams: TraktListPathSchema,
    summary: "Get one personal list",
  },
  createList: {
    method: "POST",
    path: "/users/:id/lists",
    responses: {
      201: z.unknown(),
    },
    pathParams: z.object({
      id: z.string().default("me"),
    }),
    body: TraktListWriteBodySchema.extend({ name: z.string() }),
    summary: "Create a personal list",
  },
  updateList: {
    method: "PUT",
    path: "/users/:id/lists/:listId",
    responses: {
      200: z.unknown(),
    },
    pathParams: TraktListPathSchema,
    body: TraktListWriteBodySchema,
    summary: "Update a personal list (the slug is kept when the name changes)",
  },
  deleteList: {
    method: "DELETE",
    path: "/users/:id/lists/:listId",
    responses: {
      204: z.unknown(),
    },
    pathParams: TraktListPathSchema,
    body: c.noBody(),
    summary: "Delete a personal list and every item on it",
  },
  getListItems: {
    method: "GET",
    path: "/users/:id/lists/:listId/items/:type",
    responses: {
      200: TraktListEntriesSchema,
    },
    pathParams: TraktListPathSchema.extend({
      type: z.literal("movie,show,season,episode"),
    }),
    query: TraktPaginationSchema,
    summary: "Get movie, show, season and episode items on a personal list",
  },
  addListItems: {
    method: "POST",
    path: "/users/:id/lists/:listId/items",
    responses: {
      201: z.unknown(),
    },
    pathParams: TraktListPathSchema,
    body: TraktListItemsBodySchema,
    summary: "Add items to a personal list",
  },
  removeListItems: {
    method: "POST",
    path: "/users/:id/lists/:listId/items/remove",
    responses: {
      200: z.unknown(),
    },
    pathParams: TraktListPathSchema,
    body: TraktListItemsBodySchema,
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
  searchPeople: {
    method: "GET",
    path: "/search/person",
    responses: {
      200: TraktPersonSearchList,
    },
    query: TraktPersonSearchQuerySchema,
    summary: "Search people by name",
  },
  getPersonMovies: {
    method: "GET",
    path: "/people/:id/movies",
    pathParams: z.object({ id: z.coerce.number() }),
    responses: {
      200: TraktPersonCreditsSchema,
    },
    query: TraktExtendedSchema,
    summary: "Get the movies a person is credited on",
  },
  getPersonShows: {
    method: "GET",
    path: "/people/:id/shows",
    pathParams: z.object({ id: z.coerce.number() }),
    responses: {
      200: TraktPersonCreditsSchema,
    },
    query: TraktExtendedSchema,
    summary: "Get the shows a person is credited on",
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
