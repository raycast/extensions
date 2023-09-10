import { Cache, getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import { Preferences } from "./bookmarks";
import { searchBookmarks } from "./fetch";

export const CACHE_KEY = "axiso-search-1"

const cache = new Cache({ namespace: CACHE_KEY });

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  updateCommandMetadata({ subtitle: `Refreshing...` })

  try {
    let {data} = await searchBookmarks(preferences)

    data = data.filter(it => it.result.text.includes('#res'))
    cache.set(CACHE_KEY, JSON.stringify(data))
    updateCommandMetadata({ subtitle: `Loaded ${data.length} links` })
  } catch (ex) {
    console.log(ex)
    updateCommandMetadata({ subtitle: "Error: " + ex })
  }
  
}