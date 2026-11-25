import { ApiConfig, ApiRequest, requestJson } from "./http";
import {
  CreatePostBody,
  CreatePostResult,
  ListPostsQuery,
  Post,
  PostList,
  PostValidationReport,
  SocialAccount,
} from "./types";

export const API_URL = "https://post.adaptlypost.com/post/api/v1";
export const APP_URL = "https://adaptlypost.com";

export function createApi(config: ApiConfig) {
  const send = <T>(request: ApiRequest) => requestJson<T>(config, request);
  const postPath = (postId: string) => `/social-posts/${encodeURIComponent(postId)}`;

  return {
    listAccounts: () => send<{ accounts: SocialAccount[] }>({ path: "/social-accounts" }),
    listPosts: (listPostsQuery: ListPostsQuery) =>
      send<PostList>({ path: "/social-posts", query: { ...listPostsQuery, sortOrder: "NEWEST" } }),
    validatePost: (createPostBody: CreatePostBody) =>
      send<PostValidationReport>({ method: "POST", path: "/social-posts/validate", body: createPostBody }),
    createPost: (createPostBody: CreatePostBody) =>
      send<CreatePostResult>({ method: "POST", path: "/social-posts", body: createPostBody }),
    publishDraft: (postId: string, timezone: string) =>
      send<unknown>({ method: "POST", path: `${postPath(postId)}/publish`, body: { timezone, publishNow: true } }),
    unschedulePost: (postId: string) => send<Post>({ method: "POST", path: `${postPath(postId)}/unschedule` }),
    retryFailedPlatforms: (postId: string) =>
      send<unknown>({ method: "POST", path: `${postPath(postId)}/retry`, body: {} }),
    deletePost: (postId: string) => send<{ deleted: boolean }>({ method: "DELETE", path: postPath(postId) }),
  };
}

export type AdaptlyPostApi = ReturnType<typeof createApi>;
