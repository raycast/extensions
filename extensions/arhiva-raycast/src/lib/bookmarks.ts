import { getAuthenticatedConvexClient } from "./auth";
import { api, type BookmarkFormInput, type Id } from "./convex-api";

export type {
  Bookmark,
  BookmarkCreateResult,
  BookmarkFormInput,
  Collection,
  DashboardSnapshot,
  Id,
} from "./convex-api";

export async function getDashboardSnapshot(limit = 100) {
  const convex = await getAuthenticatedConvexClient();
  return await convex.query(api.dashboard.getBookmarkDashboardSnapshot, { limit });
}

export async function listCollections() {
  const convex = await getAuthenticatedConvexClient();
  return await convex.query(api.collections.list, {});
}

export async function createBookmark(input: BookmarkFormInput) {
  const convex = await getAuthenticatedConvexClient();
  return await convex.action(api.bookmarks_enrichment.create, input);
}

export async function updateBookmark(id: Id<"libraryItems">, input: BookmarkFormInput) {
  const convex = await getAuthenticatedConvexClient();
  return await convex.mutation(api.bookmarks.update, {
    id,
    ...input,
  });
}

export async function archiveBookmark(id: Id<"libraryItems">) {
  const convex = await getAuthenticatedConvexClient();
  return await convex.mutation(api.bookmarks.remove, { id });
}

export async function restoreBookmark(id: Id<"libraryItems">) {
  const convex = await getAuthenticatedConvexClient();
  return await convex.mutation(api.bookmarks.restore, { id });
}

export async function setBookmarkRead(id: Id<"libraryItems">, isRead: boolean) {
  const convex = await getAuthenticatedConvexClient();
  return await convex.mutation(api.bookmarks.update, {
    id,
    isRead,
  });
}

export async function setBookmarkFavorite(id: Id<"libraryItems">, isFavorite: boolean) {
  const convex = await getAuthenticatedConvexClient();
  return await convex.mutation(api.bookmarks.update, {
    id,
    isFavorite,
  });
}
