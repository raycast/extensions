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
    const prepareBookmarkData = (bookmarks: Bookmark[]) => {
      const prepared: PreparedBookmarkItem[] = [];
      const nameSearchTargets: Array<{ prepared: Fuzzysort.Prepared; originalIndex: number }> = [];
      const urlSearchTargets: Array<{ prepared: Fuzzysort.Prepared; originalIndex: number }> = [];

      bookmarks.forEach((bookmark, index) => {
        const nameSearchTarget = {
          prepared: fuzzysort.prepare(bookmark.name),
          originalIndex: index,
        };

        const urlSearchTarget = {
          prepared: fuzzysort.prepare(bookmark.url),
          originalIndex: index,
        };

        prepared.push({
          original: bookmark,
          nameSearchTarget,
          urlSearchTarget,
        });

        nameSearchTargets.push(nameSearchTarget);
        urlSearchTargets.push(urlSearchTarget);
      });

      return { prepared, nameSearchTargets, urlSearchTargets };
    };

    const taggedData = prepareBookmarkData(taggedBookmarks);
    const untaggedData = prepareBookmarkData(untaggedBookmarks);

    return {
      searchInTags: {
        bookmarks: taggedBookmarks,
        prepared: taggedData.prepared,
        nameSearchTargets: taggedData.nameSearchTargets,
        urlSearchTargets: taggedData.urlSearchTargets,
      },
      searchInUntagged: {
        bookmarks: untaggedBookmarks,
        prepared: untaggedData.prepared,
        nameSearchTargets: untaggedData.nameSearchTargets,
        urlSearchTargets: untaggedData.urlSearchTargets,
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
