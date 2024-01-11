import { ActionPanel, Action, showToast, List, Icon, Toast, Cache, closeMainWindow, Clipboard } from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";

const FRONTEND_ENDPOINT = "https://surlapp.uk";
const BACKEND_ENDPOINT = "https://surlapp.uk";
const CACHE_KEY = "surl-history";
const MAX_HISTORY_COUNT = 15;

type Item = {
  key: string;
  url: string;
};

export default function Command() {
  const cache = new Cache();
  const cachedData = cache.get(CACHE_KEY);
  const cachedItems: Item[] = cachedData ? JSON.parse(cachedData) : [];
  const itemsCount = cachedItems.length;

  const [searchText, setSearchText] = useState("");
  const [shortenUrl, setShortenUrl] = useState("");
  const [items, setItems] = useState<Item[]>(cachedItems);

  const handleChangeText = (text: string) => {
    setSearchText(text);
    const filteredItems = cachedItems.filter((item) => item.url.toLowerCase().includes(text.toLowerCase()));
    setItems(filteredItems);
  };

  const handleSubmit = async () => {
    if (!searchText) {
      showToast(Toast.Style.Failure, "", "Please enter valid URL");
      return;
    }

    console.log(searchText);
    try {
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
      setSearchText("");
      Clipboard.copy(`${FRONTEND_ENDPOINT}/${json.key}`);
      showToast({ title: "", message: "Created Successfully. Copied to clipboard." });

      if (itemsCount >= MAX_HISTORY_COUNT) {
        // MEMO: remove last item and store in cache
        const newItems = [{ key: json.key, url: json.url }, ...items.slice(0, MAX_HISTORY_COUNT - 1)];
        cache.set(CACHE_KEY, JSON.stringify(newItems));
      } else {
        // MEMO: store in cache
        const newItems = [{ key: json.key, url: json.url }, ...items];
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
      onSearchTextChange={handleChangeText}
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
          subtitle={searchText ? searchText : "Your URL will be showed here"}
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
      <List.Section title="History">
        {itemsCount > 0 ? (
          <>
            {items.map(({ key, url }) => {
              const shortenUrl = `${FRONTEND_ENDPOINT}/${key}`;
              return (
                <List.Item
                  key={key}
                  icon={{ source: Icon.SaveDocument }}
                  title={url}
                  accessories={[{ icon: Icon.CopyClipboard, text: `/${key}` }]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard content={shortenUrl} shortcut={{ modifiers: ["cmd"], key: "c" }} />
                      <Action
                        icon={{ source: Icon.Eye }}
                        title="Toggle Detail"
                        onAction={() => console.log("Toggle Detail")}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </>
        ) : (
          <List.Item
            title="No history"
            subtitle="Please shorten the URL"
            actions={
              <ActionPanel>
                <Action title="Close" icon={{ source: Icon.Check }} onAction={() => closeMainWindow()} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
