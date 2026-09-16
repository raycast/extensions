import { open, getPreferenceValues } from "@raycast/api";

export type SearchEngine = Preferences["searchEngine"];

export const SEARCH_ENGINES: Record<
  Exclude<SearchEngine, "all">,
  { name: string; getUrl: (imageUrl: string) => string }
> = {
  google: {
    name: "Google Lens",
    getUrl: (url: string) =>
      `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`,
  },
  bing: {
    name: "Bing Visual Search",
    getUrl: (url: string) =>
      `https://www.bing.com/images/search?view=detailv2&iss=sbi&FORM=SBIHRP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(
        url,
      )}`,
  },
  yandex: {
    name: "Yandex Images",
    getUrl: (url: string) =>
      `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(url)}`,
  },
  tineye: {
    name: "TinEye",
    getUrl: (url: string) =>
      `https://tineye.com/search?url=${encodeURIComponent(url)}`,
  },
  baidu: {
    name: "Baidu Visual Search",
    getUrl: (url: string) =>
      `https://graph.baidu.com/details?isPageLoad=1&carousel=0&entrance=GENERAL&image=${encodeURIComponent(url)}`,
  },
};

/**
 * Gets the configured search engine from user preferences (defaults to 'google').
 */
export function getSelectedEngine(): SearchEngine {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.searchEngine || "google";
}

/**
 * Opens search results in the browser for the configured engine(s).
 */
export async function openVisualSearch(
  imageUrl: string,
  engine?: SearchEngine,
): Promise<string> {
  const selected = engine || getSelectedEngine();

  if (selected === "all") {
    const promises = Object.values(SEARCH_ENGINES).map((eng) =>
      open(eng.getUrl(imageUrl)),
    );
    await Promise.all(promises);
    return "All Engines";
  }

  const targetEngine = SEARCH_ENGINES[selected] || SEARCH_ENGINES.google;
  await open(targetEngine.getUrl(imageUrl));
  return targetEngine.name;
}
