import { Cache, getPreferenceValues } from "@raycast/api";
import { LastUpdated, PinboardBookmark, transformBookmark } from "./api";
import fetch from "node-fetch";

async function refreshCache() {
  const apiBasePath = "https://api.pinboard.in/v1";
  const allPostsEndpoint = `${apiBasePath}/posts/all`;
  const lastUpdatedEndpoint = `${apiBasePath}/posts/update`;

  const { apiToken } = getPreferenceValues();

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

export default async function Command() {
  await refreshCache();
}
