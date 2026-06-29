import { normalizeCollapsedWhitespace, toTagKey, trimToUndefined } from "./utils";

export type BookmarkLibraryFolder = "all" | "unread" | "unassigned" | "trash";

type BookmarkLibrarySearch = Readonly<{
  q?: string;
  tags?: string;
  collections?: string;
  folder?: BookmarkLibraryFolder;
}>;

type BookmarkLibraryBookmark = Readonly<{
  _id: string;
  url: string;
  title?: string | null;
  description?: string | null;
  tags?: ReadonlyArray<string> | null;
  updatedAt: number;
  collectionId?: string | null;
  isRead?: boolean | null;
  archivedAt?: number | null;
}>;

type BookmarkLibraryCollection = Readonly<{
  id: string;
  name: string;
}>;

type BookmarkLibraryData<TBookmark extends BookmarkLibraryBookmark> = Readonly<{
  bookmarks: ReadonlyArray<TBookmark>;
  archivedBookmarks: ReadonlyArray<TBookmark>;
  collections: ReadonlyArray<BookmarkLibraryCollection>;
}>;

type BookmarkLibraryFilters = Readonly<{
  searchQuery: string;
  includeTags: ReadonlySet<string>;
  includeCollections: ReadonlySet<string>;
  activeFolder: BookmarkLibraryFolder;
}>;

export function stripTagTokens(query: string) {
  return normalizeCollapsedWhitespace(query.replaceAll(/#[^\s]*/g, " "));
}

export function serializeList(
  value: ReadonlySet<string> | ReadonlyArray<string> | Iterable<string>,
): string | undefined {
  const items = [...value].map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) {
    return undefined;
  }
  const unique = [...new Set(items)];
  unique.sort();
  return unique.join(",");
}

function parseList(value?: string | null) {
  if (value == null || value.length === 0) {
    return new Set<string>();
  }
  return new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function normalizeBookmarkLibrarySearch(raw: BookmarkLibrarySearch): BookmarkLibrarySearch {
  const q = trimToUndefined(raw.q);
  const tagKeys = new Set([...parseList(raw.tags)].map((tag) => toTagKey(tag)).filter(Boolean));
  const tags = serializeList(tagKeys);
  const collections = serializeList(parseList(raw.collections));
  const folder = raw.folder;

  return {
    ...(q == null ? {} : { q }),
    ...(tags == null ? {} : { tags }),
    ...(collections == null ? {} : { collections }),
    ...(folder == null || folder === "all" ? {} : { folder }),
  };
}

function searchToBookmarkLibraryFilters(search: BookmarkLibrarySearch): BookmarkLibraryFilters {
  const normalized = normalizeBookmarkLibrarySearch(search);
  const includeTags = new Set(
    [...parseList(normalized.tags)].map((tag) => toTagKey(tag)).filter(Boolean),
  );

  return {
    searchQuery: normalized.q ?? "",
    includeTags,
    includeCollections: parseList(normalized.collections),
    activeFolder: normalized.folder ?? "all",
  };
}

function getBookmarkSearchableText(bookmark: BookmarkLibraryBookmark) {
  const parts = [bookmark.title, bookmark.description, bookmark.url, ...(bookmark.tags ?? [])];
  return parts
    .filter((part): part is string => part != null && part.length > 0)
    .join(" ")
    .toLowerCase();
}

function bookmarkMatchesSearchQuery(bookmark: BookmarkLibraryBookmark, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return true;
  }

  const searchableText = getBookmarkSearchableText(bookmark);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  return terms.every((term) => searchableText.includes(term));
}

function isUnassigned(bookmark: BookmarkLibraryBookmark) {
  return bookmark.collectionId == null || bookmark.collectionId.length === 0;
}

function getVisibleBookmarks<TBookmark extends BookmarkLibraryBookmark>(
  bookmarks: ReadonlyArray<TBookmark>,
  filters: BookmarkLibraryFilters,
): ReadonlyArray<TBookmark> {
  const query = filters.searchQuery.trim().toLowerCase();
  const includeTagNames = [...filters.includeTags].map((tag) => toTagKey(tag));

  return bookmarks.filter((bookmark) => {
    const bookmarkTagKeys = (bookmark.tags ?? []).map((tag) => toTagKey(tag));
    const collectionKey =
      bookmark.collectionId != null && bookmark.collectionId.length > 0
        ? bookmark.collectionId
        : null;
    const matchesQuery = bookmarkMatchesSearchQuery(bookmark, query);
    const matchesInclude =
      includeTagNames.length === 0 || includeTagNames.some((tag) => bookmarkTagKeys.includes(tag));
    const matchesCollection =
      filters.includeCollections.size === 0 ||
      (collectionKey !== null && filters.includeCollections.has(collectionKey));
    const matchesFolder =
      filters.activeFolder === "all" ||
      (filters.activeFolder === "unread" && bookmark.isRead !== true) ||
      (filters.activeFolder === "trash" && bookmark.archivedAt != null) ||
      (filters.activeFolder === "unassigned" && isUnassigned(bookmark));

    return matchesQuery && matchesInclude && matchesCollection && matchesFolder;
  });
}

export function createBookmarkLibraryModel<TBookmark extends BookmarkLibraryBookmark>({
  search,
  data,
}: Readonly<{
  search: BookmarkLibrarySearch;
  data: BookmarkLibraryData<TBookmark>;
}>) {
  const normalizedSearch = normalizeBookmarkLibrarySearch(search);
  const filters = searchToBookmarkLibraryFilters(normalizedSearch);
  const activeBookmarks = data.bookmarks.filter((bookmark) => bookmark.archivedAt == null);
  const archivedBookmarks = data.archivedBookmarks;
  const sourceBookmarks = filters.activeFolder === "trash" ? archivedBookmarks : activeBookmarks;

  return {
    dashboard: {
      visibleBookmarks: getVisibleBookmarks(sourceBookmarks, filters),
      collectionNameById: new Map(
        data.collections.map((collection) => [collection.id, collection.name]),
      ),
      isTrash: filters.activeFolder === "trash",
    },
  };
}
