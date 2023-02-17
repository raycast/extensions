import { getTodayFeaturedPageUrl } from "./utils/api";
import { closeMainWindow, open, getPreferenceValues, Cache } from "@raycast/api";

const preferences = getPreferenceValues();
const openInBrowser = preferences.openIn === "browser";
const cache = new Cache();

export default async function featuredPage() {
  const language = await cache.get("language");
  const { title, url } = await getTodayFeaturedPageUrl(language ? JSON.parse(language) : "en");

  if (openInBrowser) {
    await open(url);
    await closeMainWindow({ clearRootSearch: true });
  } else {
    await open(`raycast://extensions/vimtor/wikipedia/open-page?arguments=${encodeURI(JSON.stringify({ title }))}`);
  }
}
