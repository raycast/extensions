import MiniSearch from "minisearch";
import { Bookmark } from "../types";
import { useMemo } from "react";

export type BookmarkSearch = {
  searchInTags: MiniSearch;
  searchInUntagged: MiniSearch;
  taggedBookmarks: Bookmark[];
  untaggedBookmarks: Bookmark[];
};

export const useBookmarkSearches = (params: { selectedTags: string[]; data?: Bookmark[] }) => {
  const { data, selectedTags } = params;

  const { searchInTags, searchInUntagged, taggedBookmarks, untaggedBookmarks } = useMemo(() => {
    if (!data) {
      return {
        searchInTags: null,
        searchInUntagged: null,
        taggedBookmarks: [] as Bookmark[],
        untaggedBookmarks: [] as Bookmark[],
      };
    }

    type BookmarkKeys = keyof Bookmark;
    const storeFields: { [K in BookmarkKeys]: K } = {
      id: "id",
      spaceId: "spaceId",
      name: "name",
      url: "url",
      author: "author",
      tags: "tags",
      description: "description",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
    };

    const options = {
      fields: ["name", "url"],
      storeFields: Object.values(storeFields),
    };

    const forTagged = new MiniSearch<Bookmark>(options);
    const forUntagged = new MiniSearch<Bookmark>(options);

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

    forTagged.addAll(taggedBookmarks);
    forUntagged.addAll(untaggedBookmarks);

    return {
      searchInTags: forTagged,
      searchInUntagged: forUntagged,
      taggedBookmarks: taggedBookmarks,
      untaggedBookmarks: untaggedBookmarks,
    };
  }, [data, selectedTags]);

  return {
    searchInTags,
    searchInUntagged,
    taggedBookmarks,
    untaggedBookmarks,
  };
};
