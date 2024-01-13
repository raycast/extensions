import { ActionPanel, Action, List, Icon, Cache, closeMainWindow } from "@raycast/api";
import { useState } from "react";

const FRONTEND_ENDPOINT = "https://surlapp.uk";
const CACHE_KEY = "surl-history";

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
  const [items, setItems] = useState<Item[]>(cachedItems);

  const handleChangeText = (text: string) => {
    setSearchText(text);
    const filteredItems = cachedItems.filter((item) => item.url.toLowerCase().includes(text.toLowerCase()));
    setItems(filteredItems);
  };

  const handleRemoveCache = (url: string) => {
    const newItems = cachedItems.filter((item) => item.url !== url);
    setItems(newItems);
    cache.set(CACHE_KEY, JSON.stringify(newItems));
  };

  return (
    <List
      searchBarPlaceholder="Please enter search word"
      isLoading={false}
      searchText={searchText}
      onSearchTextChange={handleChangeText}
      isShowingDetail={false}
      throttle
    >
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
                      <Action icon={{ source: Icon.Eye }} title="Toggle Detail" onAction={() => setSearchText(url)} />
                      <Action
                        icon={{ source: Icon.Trash }}
                        title="Remove From History"
                        onAction={() => handleRemoveCache(url)}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
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
