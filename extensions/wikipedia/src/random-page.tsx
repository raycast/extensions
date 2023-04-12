import { closeMainWindow, open } from "@raycast/api";
import { getRandomPageUrl } from "./utils/api";
import { getStoredLanguage } from "./utils/language";
import { openInBrowser } from "./utils/preferences";

export default async function randomPage() {
  const language = await getStoredLanguage();
  const { title, url } = await getRandomPageUrl(language);

  if (openInBrowser) {
    await open(url);
    await closeMainWindow({ clearRootSearch: true });
  } else {
    await open(`raycast://extensions/vimtor/wikipedia/open-page?arguments=${encodeURI(JSON.stringify({ title }))}`);
  }
}
