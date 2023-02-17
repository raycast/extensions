import { closeMainWindow, Cache, getPreferenceValues, open } from "@raycast/api";
import { getRandomPageUrl } from "./utils/api";

const preferences = getPreferenceValues();
const openInBrowser = preferences.openIn === "browser";
const cache = new Cache();

export default async function randomPage() {
  const language = await cache.get("language");
  const { title, url } = await getRandomPageUrl(language ? JSON.parse(language) : "en");

  if (openInBrowser) {
    await open(url);
    await closeMainWindow({ clearRootSearch: true });
  } else {
    await open(`raycast://extensions/vimtor/wikipedia/open-page?arguments=${encodeURI(JSON.stringify({ title }))}`);
  }
}
