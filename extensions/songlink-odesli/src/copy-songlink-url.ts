import { Cache, Clipboard, closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fetch from "node-fetch";

const cache = new Cache();
const urlRegex = new RegExp(
  "https?://(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)",
);

interface SongLinkResponse {
  pageUrl: string;
}

export default async function Command() {
  try {
    const clipboard = await Clipboard.readText();

    if (!clipboard) {
      throw new Error("No text in clipboard");
    }
    const text = clipboard.trim();

    const url = text.match(urlRegex);

    if (!url) {
      throw new Error("No valid URL found");
    }
    const cachedUrl = cache.get(url[0]);
    const searchParams = new URLSearchParams();
    const preferences = getPreferenceValues();
    searchParams.set("url", encodeURIComponent(url[0]));
    if (preferences.apiKey) {
      searchParams.set("key", preferences.apiKey);
    }
    const songLinkUrl =
      cachedUrl ??
      (await fetch(`https://api.song.link/v1-alpha.1/links?${searchParams.toString()}`)
        .then((res) => res.json() as Promise<SongLinkResponse>)
        .then((res) => res.pageUrl));
    if (!songLinkUrl) {
      throw new Error("No song.link URL found");
    }
    await Clipboard.copy(songLinkUrl);
    cache.set(url[0], songLinkUrl);
    await closeMainWindow();
    await showToast({
      title: "Song.link URL copied to clipboard",
      style: Toast.Style.Success,
    });
    return;
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to retrieve song.link URL",
    });
  }
}
