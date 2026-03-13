import fuzzysort from "fuzzysort";
import { Bookmark } from "../types";
import { useMemo } from "react";

export type PreparedBookmark = {
  name: Fuzzysort.Prepared;
  url: Fuzzysort.Prepared;
  spaceName: string;
  tags: string[];
  authorNameAndEmail: string;
  originalIndex: number;
};

export type PreparedData = {
  taggedPrepare: PreparedBookmark[];
  untaggedPrepare: PreparedBookmark[];
  taggedBookmarks: Bookmark[];
  untaggedBookmarks: Bookmark[];
};

/**
 * A hook that prepares bookmark data for fuzzysort search
 *
 * fuzzysort.prepare is a preprocessing operation to optimize search performance,
 * which only needs to be performed once if the data doesn't change.
 * This hook uses useMemo to perform the prepare operation only when data or selectedTags change.
 */
export const usePrepareBookmarkSearch = (params: {
  selectedTags: string[];
  data?: Bookmark[];
}): {
  taggedPrepare: PreparedBookmark[];
  untaggedPrepare: PreparedBookmark[];
  taggedBookmarks: Bookmark[];
  untaggedBookmarks: Bookmark[];
} => {
  const { data, selectedTags } = params;

  const { taggedPrepare, untaggedPrepare, taggedBookmarks, untaggedBookmarks } = useMemo(() => {
    if (!data) {
      return {
        taggedPrepare: [],
        untaggedPrepare: [],
        taggedBookmarks: [] as Bookmark[],
        untaggedBookmarks: [] as Bookmark[],
      };
    }

    const { taggedBookmarks, untaggedBookmarks } = data.reduce(
      (acc, item) => {
        const tagged = item.tags.some((tag) => selectedTags.includes(`${item.spaceId}:${tag}`));
        return {
          taggedBookmarks: tagged ? [...acc.taggedBookmarks, item] : acc.taggedBookmarks,
          untaggedBookmarks: !tagged ? [...acc.untaggedBookmarks, item] : acc.untaggedBookmarks,
        };
      },
      {
        taggedBookmarks: [] as Bookmark[],
        untaggedBookmarks: [] as Bookmark[],
      },
    );

    const prepareBookmarkData = (bookmarks: Bookmark[]): PreparedBookmark[] => {
      return bookmarks.map((bookmark, index) => ({
        name: fuzzysort.prepare(bookmark.name),
        url: fuzzysort.prepare(bookmark.url),
        spaceName: bookmark.spaceName,
        tags: bookmark.tags,
        authorNameAndEmail: `${bookmark.authorName} <${bookmark.authorEmail}>`,
        originalIndex: index,
      }));
    };

    const taggedPrepare = prepareBookmarkData(taggedBookmarks);
    const untaggedPrepare = prepareBookmarkData(untaggedBookmarks);

    return {
      taggedPrepare,
      untaggedPrepare,
      taggedBookmarks,
      untaggedBookmarks,
    };
  }, [data, selectedTags]);

  return {
    taggedPrepare,
    untaggedPrepare,
    taggedBookmarks,
    untaggedBookmarks,
  };
};
