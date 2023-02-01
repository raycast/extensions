import { getPreferenceValues, Cache } from "@raycast/api";
import fetch from "node-fetch";
import { usePromise } from "@raycast/utils";

const apiBasePath = "https://api.pinboard.in/v1";

const { apiToken } = getPreferenceValues();

export interface PinboardBookmark {
  href: string;
  description: string;
  extended: string;
  meta: string;
  hash: string;
  time: string;
  shared: "yes" | "no";
  toread: "yes" | "no";
  tags: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  tags: string;
  private: boolean;
  readLater: boolean;
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
  console.debug({ isFirstInit });

  // Get the last updated time from the server and from the cache. We always want these values.
  const cachedLastUpdated = pinboardCache.get("lastUpdated");
  const serverLastUpdated = (await fetch(`${lastUpdatedEndpoint}?${params.toString()}`).then((res) => {
    if (!res.ok) {
      return { update_time: "na" };
    } else {
      return res.json();
    }
  })) as LastUpdated;

  const shouldRefresh = cachedLastUpdated !== serverLastUpdated?.update_time;
  console.debug({ shouldRefresh, cachedLastUpdated, serverLastUpdated });

  const serverBookmarks = (await fetch(`${allPostsEndpoint}?${params.toString()}`).then((res) => {
    if (!res.ok) {
      return Promise.reject(res.statusText);
    } else {
      return res.json();
    }
  })) as PinboardBookmark[];

  const transformedServerBookmarks = serverBookmarks.map((post) => transformBookmark(post));

  if (shouldRefresh && serverBookmarks && serverLastUpdated) {
    console.debug("Refreshing cache...");
    pinboardCache.set("lastUpdated", serverLastUpdated.update_time);
    console.debug("Updated lastUpdated cache");
    pinboardCache.set("bookmarks", JSON.stringify(transformedServerBookmarks));
    console.debug("Updated bookmarks cache");
    return `Successfully updated cache! There are now ${Object.keys(serverBookmarks).length} items`;
  }
  return "There was no need for an update, so I didn't update";
}

export function useSearchBookmarks() {
 const params = new URLSearchParams({ auth_token: apiToken, format: "json" });

  const allPostsEndpoint = `${apiBasePath}/posts/all`;
  const lastUpdatedEndpoint = `${apiBasePath}/posts/update`;

  const pinboardCache = new Cache({
    namespace: "pinboard",
  });

  const cachedLastUpdated = pinboardCache.get("lastUpdated");

  const { data, isLoading } = usePromise(async () => {
    const serverLastUpdated = (await fetch(`${lastUpdatedEndpoint}?${params.toString()}`).then((res) => {
      if (!res.ok) {
        return { update_time: "na" };
      } else {
        return res.json();
      }
    })) as LastUpdated;

    const shouldUpdateCache = Boolean(cachedLastUpdated !== serverLastUpdated?.update_time);

    let bookmarks = [] as Bookmark[];
    if (shouldUpdateCache) {
      // Get the data from the server
      const serverBookmarks = (await fetch(`${allPostsEndpoint}?${params.toString()}`).then((res) => {
        if (!res.ok) {
          return Promise.reject(res.statusText);
        }
        return res.json();
      })) as PinboardBookmark[];

      console.log("Server Bookmarks:", serverBookmarks);
      bookmarks = serverBookmarks.map((post) => transformBookmark(post)) as Bookmark[];
      console.log("Transformed Bookmarks:", bookmarks);
      pinboardCache.set("lastUpdated", serverLastUpdated.update_time);
      pinboardCache.set("bookmarks", JSON.stringify(bookmarks));
    } else {
      // Get the data from the cache
      console.log("Getting bookmarks from cache")
      const cachedBookmarks = pinboardCache.get("bookmarks");
      if (cachedBookmarks) {
        bookmarks = JSON.parse(cachedBookmarks) as Bookmark[];
       }
    }
    return bookmarks
  });

  return {
    bookmarks: data,
    isLoading,
  };
}

function transformBookmark(post: PinboardBookmark): Bookmark {
  return {
    id: post.hash as string,
    url: post.href as string,
    title: post.description as string,
    tags: post.tags as string,
    private: (post.shared as string) === "no",
    readLater: (post.toread as string) === "yes",
  };
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
