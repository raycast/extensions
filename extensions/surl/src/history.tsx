import { ActionPanel, Action, List, Icon, Cache, openExtensionPreferences } from "@raycast/api";
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
  const [items, setItems] = useState<Item[]>(cachedItems);

  const handleRemoveCache = (index: number) => {
    const newItems = cachedItems.filter((_, i) => i !== index);
    setItems(newItems);
    cache.set(CACHE_KEY, JSON.stringify(newItems));
  };

  return (
    <List searchBarPlaceholder="Please enter search word" isLoading={false}>
      <List.Section title="History">
        {items.map(({ key, url }, index) => {
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
                    icon={{ source: Icon.Trash }}
                    style={Action.Style.Destructive}
                    title="Remove from History"
                    onAction={() => handleRemoveCache(index)}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                  <ActionPanel.Section title="Global Options">
                    <Action
                      icon={{ source: Icon.Clock }}
                      title="Customize Expiration Date"
                      onAction={openExtensionPreferences}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
