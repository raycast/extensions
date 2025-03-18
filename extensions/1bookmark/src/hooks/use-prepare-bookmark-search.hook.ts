import fuzzysort from "fuzzysort";
import { Bookmark } from "../types";
import { useMemo } from "react";

export type PreparedBookmarkItem = {
  original: Bookmark;
  nameSearchTarget: {
    prepared: Fuzzysort.Prepared;
    originalIndex: number;
  };
  urlSearchTarget: {
    prepared: Fuzzysort.Prepared;
    originalIndex: number;
  };
};

export type PreparedBookmarkSearch = {
  searchInTags: {
    bookmarks: Bookmark[];
    prepared: PreparedBookmarkItem[];
    nameSearchTargets: Array<{ prepared: Fuzzysort.Prepared; originalIndex: number }>;
    urlSearchTargets: Array<{ prepared: Fuzzysort.Prepared; originalIndex: number }>;
  };
  searchInUntagged: {
    bookmarks: Bookmark[];
    prepared: PreparedBookmarkItem[];
    nameSearchTargets: Array<{ prepared: Fuzzysort.Prepared; originalIndex: number }>;
    urlSearchTargets: Array<{ prepared: Fuzzysort.Prepared; originalIndex: number }>;
  };
  taggedBookmarks: Bookmark[];
  untaggedBookmarks: Bookmark[];
};

/**
 * A hook that prepares bookmark data for fuzzysort search
 *
 * fuzzysort.prepare is a preprocessing operation to optimize search performance,
 * which only needs to be performed once if the data doesn't change.
 * This hook uses useMemo to perform the prepare operation only when data or selectedTags change.
 *
 * The prepared data is used for actual searches in the useBookmarkSearch hook.
 */
export const usePrepareBookmarkSearch = (params: { selectedTags: string[]; data?: Bookmark[] }) => {
  const { data, selectedTags } = params;

  const { searchInTags, searchInUntagged, taggedBookmarks, untaggedBookmarks } = useMemo(() => {
    if (!data) {
      return {
        searchInTags: {
          bookmarks: [],
          prepared: [],
          nameSearchTargets: [],
          urlSearchTargets: [],
        },
        searchInUntagged: {
          bookmarks: [],
          prepared: [],
          nameSearchTargets: [],
          urlSearchTargets: [],
        },
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

    // Prepare data for fuzzysort
    // This operation is performed only when data changes (see useMemo dependency array)
    const prepareTaggedBookmarks = taggedBookmarks.map((bookmark, index) => {
      return {
        original: bookmark,
        nameSearchTarget: {
          prepared: fuzzysort.prepare(bookmark.name),
          originalIndex: index,
        },
        urlSearchTarget: {
          prepared: fuzzysort.prepare(bookmark.url),
          originalIndex: index,
        },
      };
    });

    const prepareUntaggedBookmarks = untaggedBookmarks.map((bookmark, index) => {
      return {
        original: bookmark,
        nameSearchTarget: {
          prepared: fuzzysort.prepare(bookmark.name),
          originalIndex: index,
        },
        urlSearchTarget: {
          prepared: fuzzysort.prepare(bookmark.url),
          originalIndex: index,
        },
      };
    });

    return {
      searchInTags: {
        bookmarks: taggedBookmarks,
        prepared: prepareTaggedBookmarks,
        nameSearchTargets: prepareTaggedBookmarks.map((item) => item.nameSearchTarget),
        urlSearchTargets: prepareTaggedBookmarks.map((item) => item.urlSearchTarget),
      },
      searchInUntagged: {
        bookmarks: untaggedBookmarks,
        prepared: prepareUntaggedBookmarks,
        nameSearchTargets: prepareUntaggedBookmarks.map((item) => item.nameSearchTarget),
        urlSearchTargets: prepareUntaggedBookmarks.map((item) => item.urlSearchTarget),
      },
      taggedBookmarks,
      untaggedBookmarks,
    };
  }, [data, selectedTags]);

  return {
    searchInTags,
    searchInUntagged,
    taggedBookmarks,
    untaggedBookmarks,
  };
};
