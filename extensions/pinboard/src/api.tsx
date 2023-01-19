import { getPreferenceValues, showToast, Toast, Cache, Detail } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";

const apiBasePath = "https://api.pinboard.in/v1";

const { apiToken, constantTags } = getPreferenceValues();

export interface Bookmark {
  href: string
  description: string
  extended: string
  meta: string
  hash: string
  time: string
  shared: "yes" | "no"
  toread: "yes" | "no"
  tags: string
}

export interface BookmarksState {
  bookmarks: Bookmark[];
  isLoading: boolean;
  title: string;
}

export enum SearchKind {
  Constant,
  All,
}

type LastUpdated = {
  update_time: string;
};

export async function refreshCache() {

  const allPostsEndpoint = `${apiBasePath}/posts/all`;
  const lastUpdatedEndpoint = `${apiBasePath}/posts/update`;

  const params = new URLSearchParams({ auth_token: apiToken, format: "json" });

  const pinboardCache = new Cache({
    namespace: "pinboard",
  });

  const isFirstInit = pinboardCache.isEmpty;
  console.debug({ isFirstInit })

  // Get the last updated time from the server and from the cache. We always want these values.
  const cachedLastUpdated = pinboardCache.get("lastUpdated");
  const serverLastUpdated = await fetch(`${lastUpdatedEndpoint}?${params.toString()}`).then((res) => {
    if (!res.ok) {
      return {update_time: "na"}
    } else {
      return res.json();
    }
  }) as LastUpdated;

  const shouldRefresh = cachedLastUpdated !== serverLastUpdated?.update_time;
  console.debug({shouldRefresh, cachedLastUpdated, serverLastUpdated})

  const serverPosts = await fetch(`${allPostsEndpoint}?${params.toString()}`).then((res) => {
    if (!res.ok) {
      return [];
    } else {
      return res.json();
    }
  }) as Bookmark[];

  if (shouldRefresh && serverPosts && serverLastUpdated) {
    console.debug("Refreshing cache...")
    pinboardCache.set("lastUpdated", serverLastUpdated.update_time);
    console.debug("Updated lastUpdated cache")
    pinboardCache.set("posts", JSON.stringify(serverPosts));
    console.debug("Updated posts cache")
    return `Successfully updated cache! There are now ${Object.keys(serverPosts).length} items`;
  }
  return "There was no need for an update, so I didn't update";
}

export function useSearchBookmarks(searchKind: SearchKind) {
  const [state, setState] = useState<BookmarksState>({ bookmarks: [], isLoading: true, title: "" });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (searchText: string) => {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      try {
        setState((oldState) => ({
          ...oldState,
          isLoading: true,
        }));
        let bookmarks: Bookmark[];
        switch (searchKind) {
          case SearchKind.All:
            bookmarks = await searchBookmarks(searchText, searchKind, cancelRef.current.signal);
            break;
          case SearchKind.Constant:
            bookmarks = await searchBookmarks(searchText + " " + constantTags, searchKind, cancelRef.current.signal);
            break;
        }

        setState((oldState) => ({
          ...oldState,
          bookmarks: bookmarks,
          isLoading: false,
          title: searchKind === SearchKind.All && searchText.length === 0 ? "Recent Bookmarks" : "Found Bookmarks",
        }));
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        console.error("searchBookmarks error", error);
        showToast({ title: "Could not search bookmarks", message: String(error), style: Toast.Style.Failure });
      }
    },
    [searchKind]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, [search]);

  return {
    state: state,
    search: search,
  };
}

// function searchBookmarksCache(searchText: string) {
// }

async function searchBookmarks(searchText: string, kind: SearchKind, signal: AbortSignal): Promise<Bookmark[]> {
  const path = kind == SearchKind.All && searchText.length === 0 ? "/posts/recent" : "/posts/all";

  const params = new URLSearchParams();
  if (searchText.length > 0) {
    params.append("tag", searchText);
    params.append("results", "100");
  }
  params.append("format", "json");
  params.append("auth_token", apiToken);

  const response = await fetch(apiBasePath + path + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const json = (await response.json()) as Record<string, unknown>;
  const posts = (json?.posts ?? json) as Record<string, unknown>[];
  return posts.map((post) => {
    return {
      id: post.hash as string,
      url: post.href as string,
      title: post.description as string,
      tags: post.tags as string,
      private: (post.shared as string) === "no",
      readLater: (post.toread as string) === "yes",
    };
  });
}

export async function addBookmark(bookmark: Bookmark): Promise<unknown> {
  const params = new URLSearchParams();
  params.append("url", bookmark.url);
  params.append("description", bookmark.title ?? "New Bookmark");
  params.append("tags", bookmark.tags ?? "");
  params.append("shared", bookmark.private ? "no" : "yes");
  params.append("toread", bookmark.readLater ? "yes" : "no");
  params.append("format", "json");
  params.append("auth_token", apiToken);

  const response = await fetch(apiBasePath + "/posts/add?" + params.toString(), {
    method: "post",
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const result = (await response.json()) as Record<string, unknown>;
  if (result?.result_code !== "done") {
    return Promise.reject(result?.result_code ?? "Response Error");
  }

  return result;
}
