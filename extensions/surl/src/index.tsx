import { ActionPanel, Action, showToast, List, Toast, Cache, Clipboard } from "@raycast/api";
import { useState } from "react";
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

export default function Command() {
  const cache = new Cache();
  // const isEmpty = cache.isEmpty;
  const cachedData = cache.get(CACHE_KEY);
  const cachedItems: Item[] = cachedData ? JSON.parse(cachedData) : [];
  const itemsCount = cachedItems.length;

  const [searchText, setSearchText] = useState("");
  const [shortenUrl, setShortenUrl] = useState("");

  const handleSubmit = async () => {
    if (!searchText) {
      showToast(Toast.Style.Failure, "", "Please enter valid URL");
      return;
    }

    console.log(searchText);
    try {
      if (!isValidUrl(searchText)) {
        showToast(Toast.Style.Failure, "", "Please enter valid URL");
        return;
      }

      const res = await fetch(BACKEND_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: searchText }),
      });

      if (!res.ok) throw new Error("Failed to create");

      const json = (await res.json()) as { key: string; url: string };

      setShortenUrl(`${FRONTEND_ENDPOINT}/${json.key}`);
      Clipboard.copy(`${FRONTEND_ENDPOINT}/${json.key}`);
      showToast({ title: "", message: "Created Successfully. Copied to clipboard." });

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
      console.log(e);
      showToast(Toast.Style.Failure, "", "Failed to create");
    }
  };

  return (
    <List
      searchBarPlaceholder="Please enter the URL you want to shorten"
      isLoading={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={false}
      throttle
    >
      {shortenUrl ? (
        <List.Item
          title="Shorten URL:"
          subtitle={shortenUrl}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={shortenUrl} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Item
          title="URL:"
          subtitle={searchText ? searchText : "Short URL will be showed here"}
          actions={
            <ActionPanel>
              <Action
                title="Create a Shorten URL"
                onAction={handleSubmit}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
