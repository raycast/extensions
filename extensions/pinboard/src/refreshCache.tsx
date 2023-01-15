import { Cache, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const { apiToken } = getPreferenceValues();

const ALL_ENDPOINT = "https://api.pinboard.in/v1/posts/all";
const LAST_UPDATED_ENDPOINT = "https://api.pinboard.in/v1/posts/update";
const params = new URLSearchParams({ auth_token: apiToken, format: "json" });

type LastUpdated = {
  update_time: string;
};

export default function RefreshCache() {
  const pinboardCache = new Cache({
    namespace: "pinboard",
  });

  const isFirstInit = pinboardCache.isEmpty;
  console.debug({ isFirstInit })

  // Get the last updated time from the server and from the cache. We always want these values.
  const cachedLastUpdated = pinboardCache.get("lastUpdated");
  const { data: serverLastUpdated } = useFetch<LastUpdated>(`${LAST_UPDATED_ENDPOINT}?${params.toString()}`);

  const shouldRefresh = cachedLastUpdated !== serverLastUpdated?.update_time;
  console.debug({shouldRefresh, cachedLastUpdated, serverLastUpdated})

  const {
    data: serverPosts,
    isLoading,
    error: serverPostsError,
  } = useFetch(`${ALL_ENDPOINT}?${params.toString()}`, {
    execute: isFirstInit || shouldRefresh,
  });

  if (!isLoading && shouldRefresh && serverPosts && serverLastUpdated && !serverPostsError) {
    console.debug("Refreshing cache...")
    pinboardCache.set("lastUpdated", serverLastUpdated.update_time);
    console.debug("Updated lastUpdated cache")
    pinboardCache.set("posts", JSON.stringify(serverPosts));
    console.debug("Updated posts cache")
    return;
  }
  return;
}
