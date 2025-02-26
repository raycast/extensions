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
  watched_at: z.string().date(),
});

export const TraktRecommendationRequestSchema = TraktPaginationSchema.merge(TraktExtendedSchema).extend({
  ignore_collected: z.coerce.boolean(),
  ignore_watchlisted: z.coerce.boolean(),
});

export const TraktSearchSchema = TraktPaginationSchema.merge(TraktExtendedSchema).extend({
  query: z.string(),
  fields: z.enum(["title"]),
});

export const TraktPaginationWithSortingSchema = TraktPaginationSchema.merge(TraktSortingSchema);

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
    slug: z.string(),
    imdb: z.string(),
    tmdb: z.number(),
  }),
  images: TraktImageListItem.optional(),
});

export const TraktMovieListItem = z.object({
  type: z.string(),
  score: z.number(),
  plays: z.number().optional(),
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
    tvdb: z.number(),
    imdb: z.string(),
    tmdb: z.number(),
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
});

export const TraktShowBaseItem = z.object({
  title: z.string(),
  year: z.number().optional(),
  ids: z.object({
    trakt: z.number(),
    slug: z.string(),
    tvdb: z.number(),
    imdb: z.string(),
    tmdb: z.number(),
  }),
  images: TraktImageListItem.optional(),
});

export const TraktShowListItem = z.object({
  type: z.string(),
  score: z.number(),
  plays: z.number().optional(),
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
    tvdb: z.number(),
    tmdb: z.number(),
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
