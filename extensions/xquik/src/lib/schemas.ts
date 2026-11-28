import { z } from "zod";

export const authorSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  profilePicture: z.string().nullish(),
});
export type Author = z.infer<typeof authorSchema>;

export const profileSchema = authorSchema.extend({
  description: z.string().nullish(),
  followers: z.number().nullish(),
  following: z.number().nullish(),
  statusesCount: z.number().nullish(),
  createdAt: z.string().nullish(),
  location: z.string().nullish(),
  url: z.string().nullish(),
  contactInfo: z
    .object({
      emails: z.array(z.object({ value: z.string() })).nullish(),
      links: z.array(z.object({ url: z.string() })).nullish(),
    })
    .nullish(),
});
export type Profile = z.infer<typeof profileSchema>;

export const postSchema = z.object({
  id: z.string(),
  text: z.string(),
  url: z.string().nullish(),
  createdAt: z.string().nullish(),
  likeCount: z.number().nullish(),
  retweetCount: z.number().nullish(),
  replyCount: z.number().nullish(),
  quoteCount: z.number().nullish(),
  viewCount: z.number().nullish(),
  bookmarkCount: z.number().nullish(),
  media: z.array(z.object({ type: z.string(), mediaUrl: z.string() })).nullish(),
  author: authorSchema.nullish(),
});
export type Post = z.infer<typeof postSchema>;

export const postLookupSchema = z
  .object({ tweet: postSchema, author: authorSchema.nullish() })
  .transform(({ tweet, author }): Post => ({ ...tweet, author: tweet.author ?? author }));

export const postPageSchema = z.object({
  tweets: z.array(postSchema),
  has_next_page: z.boolean().nullish(),
  next_cursor: z.string().nullish(),
});

export const userPageSchema = z.object({
  users: z.array(profileSchema),
  has_next_page: z.boolean().nullish(),
  next_cursor: z.string().nullish(),
});

export const followCheckSchema = z.object({
  isFollowing: z.boolean(),
  isFollowedBy: z.boolean(),
  sourceUsername: z.string(),
  targetUsername: z.string(),
});
export type FollowCheck = z.infer<typeof followCheckSchema>;

export const trendSchema = z.object({
  name: z.string(),
  query: z.string().nullish(),
  rank: z.number().nullish(),
  url: z.string().nullish(),
  tweetVolume: z.number().nullish(),
});
export type Trend = z.infer<typeof trendSchema>;

export const trendListSchema = z.object({ trends: z.array(trendSchema) });

export const monitorSchema = z.object({
  id: z.string(),
  username: z.string().nullish(),
  query: z.string().nullish(),
  name: z.string().nullish(),
  eventTypes: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type Monitor = z.infer<typeof monitorSchema>;

export const monitorPageSchema = z.object({
  monitors: z.array(monitorSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().nullish(),
});

export const monitorDeletionSchema = z.object({ success: z.boolean() });

export const monitorEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  username: z.string().nullish(),
  query: z.string().nullish(),
  occurredAt: z.string(),
  data: z.unknown(),
});
export type MonitorEvent = z.infer<typeof monitorEventSchema>;

export const eventPageSchema = z.object({
  events: z.array(monitorEventSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().nullish(),
});

export const savedMediaSchema = z.object({
  mediaUrl: z.string(),
  mediaType: z.string(),
  tweetId: z.string(),
});
export type SavedMedia = z.infer<typeof savedMediaSchema>;

export const mediaDownloadSchema = z.object({ items: z.array(savedMediaSchema) });
