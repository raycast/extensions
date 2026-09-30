import fuzzysort from "fuzzysort";
import { Bookmark } from "../types";
import { useMemo } from "react";

export type PreparedBookmark = {
  preparedName: Fuzzysort.Prepared;
  preparedUrl: Fuzzysort.Prepared;
  // For tag-name match bonus scoring. The `#tag` filter uses the raw tags below.
  preparedTags: Fuzzysort.Prepared[];
  spaceName: string;
  tags: string[];
  authorNameAndEmail: string;
  originalIndex: number;
};

export type PreparedData = {
  prepared: PreparedBookmark[];
  bookmarks: Bookmark[];
};

/**
 * A hook that prepares bookmark data for fuzzysort search
 *
 * fuzzysort.prepare is a preprocessing operation to optimize search performance,
 * which only needs to be performed once if the data doesn't change.
 * This hook uses useMemo to perform the prepare operation only when data changes.
 */
export const usePrepareBookmarkSearch = (params: { data?: Bookmark[] }): PreparedData => {
  const { data } = params;

  return useMemo(() => {
    if (!data) {
      return {
        prepared: [],
        bookmarks: [] as Bookmark[],
      };
    }

    const prepared = data.map(
      (bookmark, index): PreparedBookmark => ({
        preparedName: fuzzysort.prepare(bookmark.name),
        preparedUrl: fuzzysort.prepare(bookmark.url),
        preparedTags: bookmark.tags.map((tag) => fuzzysort.prepare(tag)),
        spaceName: bookmark.spaceName,
        tags: bookmark.tags,
        authorNameAndEmail: `${bookmark.authorName} <${bookmark.authorEmail}>`,
        originalIndex: index,
      }),
    );

    return {
      prepared,
      bookmarks: data,
    };
  }, [data]);
};
