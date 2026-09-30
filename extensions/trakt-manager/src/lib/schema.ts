import { z } from "zod";

export const TraktPaginationSchema = z.object({
  page: z.coerce.number(),
  limit: z.coerce.number(),
});

export const TraktExtendedSchema = z.object({
  extended: z.enum(["full", "cloud9", "full,cloud9"]),
});

export const TraktSortingSchema = TraktExtendedSchema.extend({
  sort_by: z.enum(["added"]),
  sort_how: z.enum(["asc", "desc"]),
});

export const TraktIdSchema = z.object({
  ids: z.object({
    trakt: z.number(),
  }),
});

export const TraktIdSchemaWithTime = TraktIdSchema.extend({
  watched_at: z.string(),
});

export const TraktRatingItemSchema = TraktIdSchema.extend({
  rating: z.number().int().min(1).max(10),
  rated_at: z.string().optional(),
});

export type TraktRatingItem = z.infer<typeof TraktRatingItemSchema>;

export const TraktRecommendationRequestSchema = TraktPaginationSchema.merge(TraktExtendedSchema).extend({
  ignore_collected: z.coerce.boolean(),
  ignore_watchlisted: z.coerce.boolean(),
});

/**
 * Trakt's text search ignores the `years` filter available on its other endpoints,
 * so callers must filter by year themselves over the full result set.
 */
export const TraktSearchSchema = TraktPaginationSchema.merge(TraktExtendedSchema).extend({
  query: z.string(),
  fields: z.enum(["title", "title,aliases", "title,aliases,translations"]).optional(),
});

export const TraktIdLookupQuerySchema = z.object({
  type: z.enum(["movie", "show", "season", "episode"]),
});

const TraktLookupEntitySchema = z.object({
  title: z.string().optional(),
  year: z.number().optional(),
  ids: z.object({
    trakt: z.number(),
  }),
});

/**
 * Response of Trakt's ID lookup. Only the fields needed to name an item are modelled, since
 * this is used to tell a user which item a write action is about to touch.
 */
export const TraktIdLookupSchema = z.array(
  z.object({
    type: z.string(),
    movie: TraktLookupEntitySchema.optional(),
    show: TraktLookupEntitySchema.optional(),
    season: TraktLookupEntitySchema.extend({ number: z.number().optional() }).optional(),
    episode: TraktLookupEntitySchema.extend({
      season: z.number().optional(),
      number: z.number().optional(),
    }).optional(),
  }),
);

export type TraktIdLookupEntry = z.infer<typeof TraktIdLookupSchema>[number];

export const TraktPaginationWithSortingSchema = TraktPaginationSchema.merge(TraktSortingSchema);

export const TraktHistoryQuerySchema = TraktPaginationSchema.merge(TraktExtendedSchema);

export const TraktUpNextQuerySchema = TraktPaginationWithSortingSchema.extend({
  include_stats: z.coerce.boolean(),
});

export const TraktImageListItem = z.object({
  fanart: z.array(z.string()),
  poster: z.array(z.string()),
  logo: z.array(z.string()),
  clearart: z.array(z.string()),
  banner: z.array(z.string()),
  thumb: z.array(z.string()),
  screenshot: z.array(z.string()),
});

export const TraktHistoryItemBase = z.object({
  id: z.number().optional(),
  watched_at: z.string().optional(),
  action: z.string().optional(),
  type: z.string(),
  score: z.number().optional(),
});

export const TraktMovieBaseItem = z.object({
  title: z.string(),
  year: z.number().optional(),
  ids: z.object({
    trakt: z.number(),
    slug: z.string().optional(),
    imdb: z.string(),
    tmdb: z.number().optional(),
  }),
  images: TraktImageListItem.optional(),
  tagline: z.string().optional(),
  overview: z.string().optional(),
  released: z.string().optional(),
  runtime: z.number().optional(),
  country: z.string().optional(),
  trailer: z.string().optional(),
  homepage: z.string().optional(),
  status: z.string().optional(),
  rating: z.number().optional(),
  votes: z.number().optional(),
  comment_count: z.number().optional(),
  updated_at: z.string().optional(),
  language: z.string().optional(),
  languages: z.array(z.string()).optional(),
  genres: z.array(z.string()).optional(),
  certification: z.string().optional(),
  original_title: z.string().optional(),
});

export const TraktMovieListItem = z.object({
  type: z.string(),
  score: z.number(),
  plays: z.number().optional(),
  listed_at: z.string().optional(),
  last_watched_at: z.string().optional(),
  last_updated_at: z.string().optional(),
  movie: TraktMovieBaseItem,
});

export const TraktMovieList = z.array(TraktMovieListItem);

export const TraktEpisodeListItem = z.object({
  season: z.number(),
  number: z.number(),
  title: z.string(),
  ids: z.object({
    trakt: z.number(),
    tvdb: z.number().optional(),
    imdb: z.string(),
    tmdb: z.number().optional(),
  }),
  number_abs: z.number().optional(),
  overview: z.string().optional(),
  rating: z.number(),
  votes: z.number(),
  comment_count: z.number(),
  first_aired: z.string(),
  updated_at: z.string(),
  available_translations: z.array(z.string()),
  runtime: z.number(),
  episode_type: z.string(),
  images: TraktImageListItem.optional(),
});

export const TraktEpisodeList = z.array(TraktEpisodeListItem);

const TraktShowProgress = z.object({
  aired: z.number(),
  completed: z.number(),
  last_watched_at: z.string(),
  reset_at: z.string().optional(),
  next_episode: TraktEpisodeListItem,
  last_episode: TraktEpisodeListItem,
  upcoming: z.number().optional(),
});

export const TraktShowBaseItem = z.object({
  title: z.string(),
  year: z.number().optional(),
  ids: z.object({
    trakt: z.number(),
    slug: z.string().optional(),
    tvdb: z.number().optional(),
    imdb: z.string(),
    tmdb: z.number().optional(),
  }),
  images: TraktImageListItem.optional(),
  genres: z.array(z.string()).optional(),
  network: z.string().optional(),
});

export const TraktShowListItem = z.object({
  type: z.string(),
  score: z.number(),
  plays: z.number().optional(),
  listed_at: z.string().optional(),
  last_watched_at: z.string().optional(),
  last_updated_at: z.string().optional(),
  show: TraktShowBaseItem,
  progress: TraktShowProgress,
});

export const TraktShowList = z.array(TraktShowListItem);

export const TraktSeasonListItem = z.object({
  number: z.number(),
  ids: z.object({
    trakt: z.number(),
    tvdb: z.number().optional(),
    tmdb: z.number().optional(),
  }),
  rating: z.number(),
  votes: z.number(),
  episode_count: z.number(),
  aired_episodes: z.number(),
  title: z.string(),
  overview: z.string().optional(),
  first_aired: z.string().optional(),
  udpated_at: z.string(),
  network: z.string(),
  images: TraktImageListItem.optional(),
});

export const TraktSeasonList = z.array(TraktSeasonListItem);

export const TraktShowHistoryListItem = TraktHistoryItemBase.extend({
  show: TraktShowBaseItem,
  episode: TraktEpisodeListItem,
});

export const TraktShowHistoryList = z.array(TraktShowHistoryListItem);

export const TraktMovieHistoryListItem = TraktHistoryItemBase.extend({
  movie: TraktMovieBaseItem,
});

export const TraktMovieHistoryList = z.array(TraktMovieHistoryListItem);

export const TraktMovieRecommendationList = z.array(TraktMovieBaseItem);
export const TraktShowRecommendationList = z.array(TraktShowBaseItem);

export const TraktMediaType = z.enum(["movie", "show"]);

export type TraktMovieListItem = z.infer<typeof TraktMovieListItem>;
export type TraktMovieList = z.infer<typeof TraktMovieList>;
export type TraktShowListItem = z.infer<typeof TraktShowListItem>;
export type TraktShowList = z.infer<typeof TraktShowList>;
export type TraktSeasonListItem = z.infer<typeof TraktSeasonListItem>;
export type TraktSeasonList = z.infer<typeof TraktSeasonList>;
export type TraktEpisodeListItem = z.infer<typeof TraktEpisodeListItem>;
export type TraktEpisodeList = z.infer<typeof TraktEpisodeList>;
export type ImagesResponse = z.infer<typeof TraktImageListItem>;
export type TraktMediaType = z.infer<typeof TraktMediaType>;
export type TraktShowHistoryListItem = z.infer<typeof TraktShowHistoryListItem>;
export type TraktShowHistoryList = z.infer<typeof TraktShowHistoryList>;
export type TraktMovieHistoryListItem = z.infer<typeof TraktMovieHistoryListItem>;
export type TraktMovieHistoryList = z.infer<typeof TraktMovieHistoryList>;
export type TraktMovieRecommendationList = z.infer<typeof TraktMovieRecommendationList>;
export type TraktShowRecommendationList = z.infer<typeof TraktShowRecommendationList>;
export type TraktMovieBaseItem = z.infer<typeof TraktMovieBaseItem>;
export type TraktShowBaseItem = z.infer<typeof TraktShowBaseItem>;

export const TraktShowProgressQuerySchema = z.object({
  hidden: z.coerce.boolean().optional(),
  specials: z.coerce.boolean().optional(),
  count_specials: z.coerce.boolean().optional(),
  last_activity: z.coerce.boolean().optional(),
  extended: z.enum(["full", "cloud9", "full,cloud9"]).optional(),
});

export const TraktProgressEpisodeSchema = z.object({
  season: z.number(),
  number: z.number(),
  title: z.string().optional().nullable(),
  ids: z.object({
    trakt: z.number(),
    tvdb: z.number().optional().nullable(),
    imdb: z.string().optional().nullable(),
    tmdb: z.number().optional().nullable(),
  }),
  overview: z.string().optional().nullable(),
  rating: z.number().optional().nullable(),
  first_aired: z.string().optional().nullable(),
});

export const TraktProgressSeasonEpisodeSchema = z.object({
  number: z.number(),
  completed: z.boolean(),
  last_watched_at: z.string().optional().nullable(),
});

export const TraktProgressSeasonSchema = z.object({
  number: z.number(),
  title: z.string().optional().nullable(),
  aired: z.number(),
  completed: z.number(),
  episodes: z.array(TraktProgressSeasonEpisodeSchema).optional(),
});

export const TraktShowDetailedProgressSchema = z.object({
  aired: z.number(),
  completed: z.number(),
  last_watched_at: z.string().optional().nullable(),
  reset_at: z.string().optional().nullable(),
  next_episode: TraktProgressEpisodeSchema.optional().nullable(),
  last_episode: TraktProgressEpisodeSchema.optional().nullable(),
  seasons: z.array(TraktProgressSeasonSchema).optional(),
});

export type TraktShowProgressQuery = z.infer<typeof TraktShowProgressQuerySchema>;
export type TraktShowDetailedProgress = z.infer<typeof TraktShowDetailedProgressSchema>;

export const TraktUserRatingItemSchema = z.object({
  rated_at: z.string(),
  rating: z.number(),
  type: z.string(),
  movie: TraktMovieBaseItem.optional(),
  show: TraktShowBaseItem.optional(),
  season: z
    .object({
      number: z.number(),
      ids: z
        .object({
          trakt: z.number(),
          tvdb: z.number().optional().nullable(),
          tmdb: z.number().optional().nullable(),
        })
        .optional(),
    })
    .optional(),
  episode: z
    .object({
      season: z.number(),
      number: z.number(),
      title: z.string().optional().nullable(),
      ids: z.object({
        trakt: z.number(),
        tvdb: z.number().optional().nullable(),
        imdb: z.string().optional().nullable(),
        tmdb: z.number().optional().nullable(),
      }),
    })
    .optional(),
});

export const TraktUserRatingListSchema = z.array(TraktUserRatingItemSchema);
export type TraktUserRatingItem = z.infer<typeof TraktUserRatingItemSchema>;

export const TraktUserStatsSchema = z.object({
  movies: z
    .object({
      plays: z.number().default(0),
      watched: z.number().default(0),
      minutes: z.number().default(0),
      collected: z.number().default(0),
      ratings: z.number().default(0),
      comments: z.number().default(0),
    })
    .optional(),
  shows: z
    .object({
      watched: z.number().default(0),
      collected: z.number().default(0),
      ratings: z.number().default(0),
      comments: z.number().default(0),
    })
    .optional(),
  seasons: z
    .object({
      ratings: z.number().default(0),
      comments: z.number().default(0),
    })
    .optional(),
  episodes: z
    .object({
      plays: z.number().default(0),
      watched: z.number().default(0),
      minutes: z.number().default(0),
      collected: z.number().default(0),
      ratings: z.number().default(0),
      comments: z.number().default(0),
    })
    .optional(),
  network: z
    .object({
      friends: z.number().default(0),
      followers: z.number().default(0),
      following: z.number().default(0),
    })
    .optional(),
  ratings: z
    .object({
      total: z.number().default(0),
      distribution: z.record(z.string(), z.number()).optional(),
    })
    .optional(),
});

export type TraktUserStats = z.infer<typeof TraktUserStatsSchema>;

export const TraktListPrivacySchema = z.enum(["private", "link", "friends", "public"]);

export const TraktListSortBySchema = z.enum([
  "rank",
  "added",
  "title",
  "released",
  "runtime",
  "popularity",
  "random",
  "percentage",
  "imdb_rating",
  "tmdb_rating",
  "rt_tomatometer",
  "rt_audience",
  "metascore",
  "votes",
  "imdb_votes",
  "tmdb_votes",
  "my_rating",
  "watched",
  "collected",
]);

export const TraktListSortHowSchema = z.enum(["asc", "desc"]);

export const TraktListSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  privacy: z.string().optional(),
  share_link: z.string().optional().nullable(),
  type: z.string().optional(),
  display_numbers: z.boolean().optional(),
  allow_comments: z.boolean().optional(),
  sort_by: z.string().optional(),
  sort_how: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  item_count: z.number().optional(),
  comment_count: z.number().optional(),
  likes: z.number().optional(),
  ids: z.object({
    trakt: z.number(),
    slug: z.string().optional().nullable(),
  }),
});

export const TraktListsSchema = z.array(TraktListSchema);

export const TraktListWriteBodySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  privacy: TraktListPrivacySchema.optional(),
  display_numbers: z.boolean().optional(),
  allow_comments: z.boolean().optional(),
  sort_by: TraktListSortBySchema.optional(),
  sort_how: TraktListSortHowSchema.optional(),
});

/**
 * List entries return lightweight media objects, so external ids may be missing or null.
 */
const TraktListMediaIdsSchema = z.object({
  trakt: z.number(),
  slug: z.string().optional().nullable(),
  tvdb: z.number().optional().nullable(),
  imdb: z.string().optional().nullable(),
  tmdb: z.number().optional().nullable(),
});

export const TraktListEntrySchema = z.object({
  id: z.number(),
  rank: z.number().optional().nullable(),
  listed_at: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  type: z.string(),
  movie: z
    .object({
      title: z.string(),
      year: z.number().optional().nullable(),
      ids: TraktListMediaIdsSchema,
    })
    .optional(),
  show: z
    .object({
      title: z.string(),
      year: z.number().optional().nullable(),
      ids: TraktListMediaIdsSchema,
    })
    .optional(),
  season: z
    .object({
      number: z.number(),
      ids: TraktListMediaIdsSchema.partial().optional(),
    })
    .optional(),
  episode: z
    .object({
      season: z.number(),
      number: z.number(),
      title: z.string().optional().nullable(),
      ids: TraktListMediaIdsSchema,
    })
    .optional(),
});

export const TraktListEntriesSchema = z.array(TraktListEntrySchema);

export const TraktListItemIdSchema = z.object({
  ids: z.object({
    trakt: z.number(),
  }),
});

export const TraktListItemsBodySchema = z.object({
  movies: z.array(TraktListItemIdSchema).optional(),
  shows: z.array(TraktListItemIdSchema).optional(),
  seasons: z.array(TraktListItemIdSchema).optional(),
  episodes: z.array(TraktListItemIdSchema).optional(),
});

export type TraktList = z.infer<typeof TraktListSchema>;
export type TraktListEntry = z.infer<typeof TraktListEntrySchema>;
export type TraktListItemsBody = z.infer<typeof TraktListItemsBodySchema>;
export type TraktListWriteBody = z.infer<typeof TraktListWriteBodySchema>;

export const TraktPaginationHeaderSchema = z.object({
  "x-pagination-page": z.coerce.number().default(0),
  "x-pagination-limit": z.coerce.number().default(0),
  "x-pagination-page-count": z.coerce.number().default(0),
  "x-pagination-item-count": z.coerce.number().default(0),
});

export const withPagination = <T>(args: { status: number; body: T; headers: Headers }) => {
  const parsedHeaders = TraktPaginationHeaderSchema.parse(args.headers);

  return {
    data: args.body as T,
    pagination: parsedHeaders,
  };
};

/**
 * Trakt clamps `limit` per endpoint. The requested size is not what was served, so a scan
 * must stop on `X-Pagination-Limit` (or page-count), not on the number we asked for.
 */
export function scanPageComplete(
  pageLength: number,
  pagination: z.infer<typeof TraktPaginationHeaderSchema>,
  requestedLimit: number,
): boolean {
  const servedLimit = pagination["x-pagination-limit"] || requestedLimit;
  return pageLength < servedLimit || pagination["x-pagination-page"] >= pagination["x-pagination-page-count"];
}
