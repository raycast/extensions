import { getErrorMessage } from "./getError";
import { SimplifiedPlaylistObject } from "./spotify.api";
import { getPlaylistTracks } from "../api/getPlaylistTracks";
import { getPreferenceValues, LocalStorage } from "@raycast/api";

export default async function getAllPlaylistItems(playlist: SimplifiedPlaylistObject): Promise<string[]> {
  const CACHE_REFRESH_RATE = getPreferenceValues().cacheRefreshTime;
  const STALE_AFTER_MS = 1000 * 60 * 60 * 24 * CACHE_REFRESH_RATE; // cacheRefreshTime days

  if (!playlist.id) {
    throw Error("No playlist ID specified");
  }

  const cacheKey = `playlistItems_${playlist.id}`;
  const cacheTimestampKey = `${cacheKey}_cachedAt`;

  try {
    const [cached, cachedAtStr] = await Promise.all([
      LocalStorage.getItem<string>(cacheKey),
      LocalStorage.getItem<string>(cacheTimestampKey),
    ]);

    if (cached && cachedAtStr) {
      const cachedAt = parseInt(cachedAtStr, 10);
      const age = Date.now() - cachedAt;

      if (age <= STALE_AFTER_MS) {
        try {
          const parsed = JSON.parse(cached);
          return parsed;
        } catch (e) {
          console.warn(`Failed to parse cached playlist items for ${playlist.id}:`, e);
        }
      } else {
        console.log(`Cache for ${playlist.id} is stale (age: ${age}ms)`);
      }
    }
  } catch (e) {
    console.warn(`Error reading cache for ${playlist.id}:`, e);
  }

  try {
    const playlistUriArr: string[] = [];
    const limit = 50;
    let offset = 0;

    let response;

    do {
      response = await getPlaylistTracks(playlist.id, limit, offset);
      console.log("calling api");
      const innerPlaylistArr = response.items;

      if (innerPlaylistArr.length > 0) {
        playlistUriArr.push(
          ...innerPlaylistArr
            .map((trackObject) => trackObject.uri)
            .filter((uri): uri is string => typeof uri === "string"),
        );
        offset += limit;
      }
    } while (response.items.length > 0);

    await Promise.all([
      LocalStorage.setItem(cacheKey, JSON.stringify(playlistUriArr)),
      LocalStorage.setItem(cacheTimestampKey, Date.now().toString()),
    ]);

    return playlistUriArr;
  } catch (err) {
    const error = getErrorMessage(err);
    console.error("getAllPlaylistItems.ts Error:", error);
    throw new Error(error);
  }
}
