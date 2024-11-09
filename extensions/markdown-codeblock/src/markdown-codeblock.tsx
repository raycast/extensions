import { ActionPanel, Action, List, Clipboard, LocalStorage, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { LIST_ITEMS } from "./constants";

type Item = {
  title: string;
  icon: string;
  keywords: string[];
};

async function paste(item: Item) {
  const [codeblockTag = ""] = item.keywords;
  const copiedText = await Clipboard.readText();
  if (!copiedText) return;

  const codeblock = `\`\`\`${codeblockTag}\n${copiedText}\n\`\`\``;
  await Clipboard.paste(codeblock);

  await updateLastUsed(item);
}

async function updateLastUsed(item: Item) {
  const now = Date.now();
  const recentlyUsed = await LocalStorage.getItem<string>("recentlyUsed");
  const recentItems = recentlyUsed ? JSON.parse(recentlyUsed) : {};

  recentItems[item.title] = now;
  await LocalStorage.setItem("recentlyUsed", JSON.stringify(recentItems));
}

function sortBySearchRelevance(items: Item[], searchText: string) {
  return [...items].sort((a, b) => {
    const searchLower = searchText.toLowerCase();
    const aKeywords = a.keywords;
    const bKeywords = b.keywords;

    const aHasExactMatch = aKeywords.includes(searchLower);
    const bHasExactMatch = bKeywords.includes(searchLower);

    if (aHasExactMatch && !bHasExactMatch) return -1;
    if (bHasExactMatch && !aHasExactMatch) return 1;

    const aHasStartsWith = aKeywords.some((k) => k.startsWith(searchLower));
    const bHasStartsWith = bKeywords.some((k) => k.startsWith(searchLower));

    if (aHasStartsWith && !bHasStartsWith) return -1;
    if (bHasStartsWith && !aHasStartsWith) return 1;

    const aHasContains = aKeywords.some((k) => k.includes(searchLower));
    const bHasContains = bKeywords.some((k) => k.includes(searchLower));

    if (aHasContains && !bHasContains) return -1;
    if (bHasContains && !aHasContains) return 1;

    return 0;
  });
}

export default function Command() {
  const [items, setItems] = useState<Item[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadData() {
      const recentData = await LocalStorage.getItem<string>("recentlyUsed");
      setRecentlyUsed(recentData ? JSON.parse(recentData) : {});
    }

    loadData();
  }, []);

  useEffect(() => {
    if (Object.keys(recentlyUsed).length === 0) return;
    const sortedItems = LIST_ITEMS.sort((a, b) => {
      const aLastUsed = recentlyUsed[a.title] || 0;
      const bLastUsed = recentlyUsed[b.title] || 0;
      return bLastUsed - aLastUsed;
    });

    setItems(sortedItems);
  }, [recentlyUsed]);

  function handleFiltering(searchText: string) {
    const filteredItems = LIST_ITEMS.filter((item) => item.keywords.some((keyword) => keyword.includes(searchText)));
    const sortedItems = sortBySearchRelevance(filteredItems, searchText);
    setItems(sortedItems);
  }

  return (
    <List onSearchTextChange={handleFiltering}>
      {items.map((item, i) => (
        <List.Item
          key={i}
          icon={{ source: item.icon }}
          title={item.title}
          subtitle={item.keywords.join(", ")}
          keywords={item.keywords}
          actions={
            <ActionPanel>
              <Action
                title="Paste in Active App"
                onAction={async () => {
                  await paste(item);
                  await popToRoot({ clearSearchBar: true });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
