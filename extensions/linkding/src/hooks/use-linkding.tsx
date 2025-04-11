import { popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { default as Fuse } from "fuse.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CreateLinkdingBookmarkFormValues, LinkdingBookmark } from "../types/linkding-types";
import api from "../util/api";
import { getCachedBookmarks, saveBookmarksToCache } from "../util/cache";
import parseTags from "../util/parse-tags";

const useLinkding = () => {
  const [allBookmarks, setAllBookmarks] = useState<LinkdingBookmark[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    getCachedBookmarks()
      .then((cachedBookmarks) => {
        if (isLoading && cachedBookmarks.length > 0) setAllBookmarks(cachedBookmarks);
      })
      .catch((err) =>
        // probably not important enough to surface to user
        console.warn(`Failed to load cached bookmarks: ${err}`)
      )
      .finally(() => setIsLoading(false));
  }, [isLoading]);

  useEffect(() => {
    api
      .getBookmarks()
      .then((response) => {
        const newBookmarks = response.data.results;
        setAllBookmarks(newBookmarks);
        saveBookmarksToCache(newBookmarks);
      })
      .catch((err) => {
        showFailureToast(err, { title: "Failed to get bookmarks" });
        setAllBookmarks([]);
        saveBookmarksToCache([]);
      })
      .finally(() => setIsLoading(false));
  }, [api]);

  const fuseRef = useRef(
    new Fuse<LinkdingBookmark>([], {
      keys: [
        { name: "title", weight: 2 },
        { name: "description", weight: 1 },
        { name: "tag_names", weight: 3 },
      ],
      threshold: 0.3,
    })
  );

  useEffect(() => {
    fuseRef.current.setCollection(allBookmarks);
  }, [allBookmarks]);

  const [searchText, setSearchText] = useState("");
  const filteredBookmarks = useMemo(() => {
    if (!searchText) return allBookmarks;
    return fuseRef.current.search(searchText).map((r) => r.item);
  }, [searchText, allBookmarks]);

  const deleteBookmark = useCallback(
    (id: number) => {
      showToast(Toast.Style.Animated, "Deleting bookmark", id.toString());
      api
        .deleteBookmark(id)
        .then(() => {
          showToast(Toast.Style.Success, "Bookmark deleted", id.toString());
          const filteredBookmarks = allBookmarks.filter((bookmark) => bookmark.id !== id);
          setAllBookmarks(filteredBookmarks);
          saveBookmarksToCache(filteredBookmarks);
        })
        .catch((err) => showFailureToast(err, { title: `Failed to delete bookmark ${id}` }));
    },
    [allBookmarks]
  );

  const createBookmark = useCallback(async (values: CreateLinkdingBookmarkFormValues) => {
    showToast(Toast.Style.Animated, "Creating bookmark", values.title);
    const { tags, ...remainingValues } = values;
    api
      .createBookmark({
        ...remainingValues,
        tag_names: parseTags(tags),
      })
      .then(() => {
        showToast(Toast.Style.Success, "Bookmark created successfully", values.title);
        popToRoot();
      })
      .catch((err) => showFailureToast(err, { title: "Failed to create bookmark" }));
  }, []);

  const getMetadata = (url: string) =>
    api.getWebsiteMetadata(url).catch((err) => console.warn(`Failed to fetch metadata for ${url}: ${err}`));

  return {
    bookmarks: filteredBookmarks,
    isLoading,
    getMetadata,
    setSearchText,
    deleteBookmark,
    createBookmark,
  };
};

export default useLinkding;
