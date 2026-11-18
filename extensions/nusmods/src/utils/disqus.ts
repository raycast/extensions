import * as z from "zod/mini";

const DISQUS_API_URL = "https://disqus.com/api/3.0";
const NUS_MODS_FORUM_NAME = "nusmods-prod";

const AvatarSchema = z.object({
  cache: z.string(),
});

const AuthorSchema = z.object({
  username: z.optional(z.string()),
  name: z.nullable(z.string()),
  profileUrl: z.string(),
  avatar: AvatarSchema,
  isAnonymous: z.boolean(),
});

const PostSchema = z.object({
  id: z.string(),
  thread: z.string(),
  author: AuthorSchema,
  message: z.string(),
  createdAt: z.string(),
  likes: z.number(),
  dislikes: z.number(),
  points: z.number(),
  isEdited: z.boolean(),
  isDeleted: z.boolean(),
  isSpam: z.boolean(),
  isApproved: z.boolean(),
});

const CursorSchema = z.object({
  prev: z.nullable(z.string()),
  hasNext: z.boolean(),
  next: z.string(),
  hasPrev: z.boolean(),
  total: z.nullable(z.number()),
  id: z.string(),
  more: z.boolean(),
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  response: z.string(),
});

export const PostListResponseSchema = z.object({
  cursor: CursorSchema,
  code: z.number(),
  response: z.array(PostSchema),
});

export const PostListResultResponseSchema = z.union([ErrorResponseSchema, PostListResponseSchema]);

const ThreadSchema = z.object({
  id: z.string(),
});

export const ThreadDetailsResponseSchema = z.object({
  code: z.number(),
  response: ThreadSchema,
});

export const ThreadDetailsResultResponseSchema = z.union([ErrorResponseSchema, ThreadDetailsResponseSchema]);

export type DisqusPost = z.infer<typeof PostSchema>;
export type DisqusAuthor = z.infer<typeof AuthorSchema>;
export type DisqusThread = z.infer<typeof ThreadSchema>;
export type PostListResponse = z.infer<typeof PostListResponseSchema>;
export type ThreadDetailsResponse = z.infer<typeof ThreadDetailsResponseSchema>;

export const getDisqusThreadDetailApiUrl = (apiKey: string, courseCode: string) => {
  const url = new URL(`${DISQUS_API_URL}/threads/details.json`);

  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("forum", NUS_MODS_FORUM_NAME);
  url.searchParams.set("thread:ident", courseCode);

  return url.toString();
};

// Unfortunately, list post API do not support thread:ident, so must we query for the thread id first.
export const getDisqusListPostApiUrl = (apiKey: string, threadId: string, cursor?: string) => {
  const url = new URL(`${DISQUS_API_URL}/posts/list.json`);

  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("forum", NUS_MODS_FORUM_NAME);
  url.searchParams.set("thread", threadId);
  url.searchParams.set("limit", "100");
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  return url.toString();
};
