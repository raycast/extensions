import { makeFunctionReference } from "convex/server";

export type Id<TableName extends string> = string & { readonly __tableName: TableName };

export type Bookmark = Readonly<{
  _id: Id<"libraryItems">;
  shortId?: string | null;
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  images?: ReadonlyArray<string> | null;
  video?: string | null;
  favicon?: string | null;
  notes?: string | null;
  tags: ReadonlyArray<string>;
  updatedAt: number;
  collectionId?: Id<"collections"> | null;
  isRead?: boolean | null;
  isFavorite?: boolean | null;
  archivedAt?: number | null;
}>;

export type Collection = Readonly<{
  id: Id<"collections">;
  name: string;
  description?: string | null;
  color?: string | null;
  count?: number;
  previewImages?: ReadonlyArray<string> | null;
}>;

export type DashboardSnapshot = Readonly<{
  bookmarks: ReadonlyArray<Bookmark>;
  archivedBookmarks: ReadonlyArray<Bookmark>;
  tags: ReadonlyArray<Readonly<{ id: string; name: string; count: number }>>;
  collections: ReadonlyArray<Collection>;
  recents?: Readonly<{
    bookmarks: ReadonlyArray<string>;
    tags: ReadonlyArray<string>;
  }>;
}>;

export type BookmarkFormInput = Readonly<{
  url: string;
  title?: string;
  description?: string;
  image?: string;
  images?: ReadonlyArray<string>;
  video?: string;
  favicon?: string;
  tags?: ReadonlyArray<string>;
  collectionId?: Id<"collections"> | null;
  notes?: string;
  isRead?: boolean;
  isFavorite?: boolean;
}>;

export type BookmarkCreateResult = Readonly<{
  id: Id<"libraryItems">;
  created: boolean;
}>;

type BookmarkUpdateInput = Partial<BookmarkFormInput> & Readonly<{ id: Id<"libraryItems"> }>;
type BookmarkWriteResult = Readonly<{ id: Id<"libraryItems"> }>;

export const api = {
  dashboard: {
    getBookmarkDashboardSnapshot: makeFunctionReference<
      "query",
      Readonly<{ limit?: number }>,
      DashboardSnapshot
    >("dashboard:getBookmarkDashboardSnapshot"),
  },
  collections: {
    list: makeFunctionReference<"query", Record<string, never>, ReadonlyArray<Collection>>(
      "collections:list",
    ),
  },
  bookmarks_enrichment: {
    create: makeFunctionReference<"action", BookmarkFormInput, BookmarkCreateResult>(
      "bookmarks_enrichment:create",
    ),
  },
  bookmarks: {
    update: makeFunctionReference<"mutation", BookmarkUpdateInput, BookmarkWriteResult>(
      "bookmarks:update",
    ),
    remove: makeFunctionReference<
      "mutation",
      Readonly<{ id: Id<"libraryItems"> }>,
      BookmarkWriteResult
    >("bookmarks:remove"),
    restore: makeFunctionReference<
      "mutation",
      Readonly<{ id: Id<"libraryItems"> }>,
      BookmarkWriteResult
    >("bookmarks:restore"),
  },
};
