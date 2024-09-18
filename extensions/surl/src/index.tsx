import { showToast, Toast, Cache, Clipboard, LaunchProps, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { isValidUrl } from "./util";

const FRONTEND_ENDPOINT = "https://surlapp.uk";
const BACKEND_ENDPOINT = "https://surlapp.uk";
const CACHE_KEY = "surl-history";
const MAX_HISTORY_COUNT = 20;

type Item = {
  key: string;
  url: string;
};

export default async function Command(props: LaunchProps) {
  const url = props.arguments.url;
  const preferences = getPreferenceValues<Preferences>();

  const cache = new Cache();
  const cachedData = cache.get(CACHE_KEY);
  const cachedItems: Item[] = cachedData ? JSON.parse(cachedData) : [];
  const itemsCount = cachedItems.length;

  if (!url) {
    showToast(Toast.Style.Failure, "", "Please enter valid URL");
    return;
  }

  try {
    if (!isValidUrl(url)) {
      showToast(Toast.Style.Failure, "", "Please enter valid URL");
      return;
    }

    const expirationDate = Number(preferences.expirationDate);
    const res = await fetch(BACKEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, expirationDate }),
    });

    if (!res.ok) throw new Error("Failed to create");

    const json = (await res.json()) as { key: string; url: string };

    Clipboard.copy(`${FRONTEND_ENDPOINT}/${json.key}`);
    showToast(Toast.Style.Success, "Copied: ", `${FRONTEND_ENDPOINT}/${json.key}`);

    if (itemsCount >= MAX_HISTORY_COUNT) {
      // MEMO: remove last item and store in cache
      const newItems = [{ key: json.key, url: json.url }, ...cachedItems.slice(0, MAX_HISTORY_COUNT - 1)];
      cache.set(CACHE_KEY, JSON.stringify(newItems));
    } else {
      // MEMO: store in cache
      const newItems = [{ key: json.key, url: json.url }, ...cachedItems];
      cache.set(CACHE_KEY, JSON.stringify(newItems));
    }
  } catch (e) {
    showToast(Toast.Style.Failure, "", "Failed to create");
  }
}
