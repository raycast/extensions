import { useCachedPromise } from "@raycast/utils";
import { wp } from "./api";
import { SearchParams } from "./types";

// Posts hooks
export function usePosts(params?: SearchParams & { categories?: number; tags?: number }) {
  return useCachedPromise((searchParams) => wp.getPosts(searchParams), [params], {
    keepPreviousData: true,
  });
}

export function usePost(id: number) {
  return useCachedPromise((postId) => wp.getPost(postId), [id]);
}

// Pages hooks
export function usePages(params?: SearchParams & { parent?: number }) {
  return useCachedPromise((searchParams) => wp.getPages(searchParams), [params], {
    keepPreviousData: true,
  });
}

export function usePage(id: number) {
  return useCachedPromise((pageId) => wp.getPage(pageId), [id]);
}

// Media hooks
export function useMedia(params?: SearchParams & { media_type?: string }) {
  return useCachedPromise((searchParams) => wp.getMedia(searchParams), [params], {
    keepPreviousData: true,
  });
}

export function useMediaItem(id: number) {
  return useCachedPromise((mediaId) => wp.getMediaItem(mediaId), [id]);
}

// Comments hooks
export function useComments(params?: SearchParams & { post?: number }) {
  return useCachedPromise((searchParams) => wp.getComments(searchParams), [params], {
    keepPreviousData: true,
  });
}

export function useComment(id: number) {
  return useCachedPromise((commentId) => wp.getComment(commentId), [id]);
}

// Users hooks
export function useUsers(params?: SearchParams & { roles?: string }) {
  return useCachedPromise((searchParams) => wp.getUsers(searchParams), [params], {
    keepPreviousData: true,
  });
}

export function useUser(id: number) {
  return useCachedPromise((userId) => wp.getUser(userId), [id]);
}

export function useCurrentUser() {
  return useCachedPromise(() => wp.getCurrentUser(), []);
}

// Plugins hook
export function usePlugins() {
  return useCachedPromise(() => wp.getPlugins(), []);
}

// Taxonomy hooks
export function useCategories(params?: SearchParams) {
  return useCachedPromise((searchParams) => wp.getCategories(searchParams), [params], {
    keepPreviousData: true,
  });
}

export function useTags(params?: SearchParams) {
  return useCachedPromise((searchParams) => wp.getTags(searchParams), [params], {
    keepPreviousData: true,
  });
}

// Site info hook
export function useSiteInfo() {
  return useCachedPromise(() => wp.getSiteInfo(), []);
}

// Search hook
export function useSearch(query: string, type?: "post" | "page" | "any") {
  return useCachedPromise((q, t) => (q ? wp.search(q, t) : Promise.resolve([])), [query, type], {
    keepPreviousData: true,
  });
}
