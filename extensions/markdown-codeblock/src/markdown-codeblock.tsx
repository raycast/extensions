import {
  ActionPanel,
  Action,
  List,
  Clipboard,
  LocalStorage,
  popToRoot,
  getSelectedText,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { LIST_ITEMS } from "./constants";

type Item = {
  title: string;
  icon: string;
  keywords: string[];
};

async function paste(item: Item, text?: string) {
  if (!text?.trim()) {
    showToast({ title: "No text selected to paste.", style: Toast.Style.Failure });
    return;
  }

  const [codeblockTag = ""] = item.keywords;
  const codeblock = `\`\`\`${codeblockTag}\n${text}\n\`\`\``;
  await Clipboard.paste(codeblock);
  await updateLastUsed(item);
  await popToRoot({ clearSearchBar: true });
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
  const [recentlyUsed, setRecentlyUsed] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadRecentlyUsed() {
      const recentData = await LocalStorage.getItem<string>("recentlyUsed");
      setRecentlyUsed(recentData ? JSON.parse(recentData) : {});
    }

    loadRecentlyUsed();
  }, []);

  useEffect(() => {
    if (!recentlyUsed) return;
    const sortedItems = LIST_ITEMS.sort((a, b) => {
      const aLastUsed = recentlyUsed[a.title] || 0;
      const bLastUsed = recentlyUsed[b.title] || 0;
      return bLastUsed - aLastUsed;
    });

    setItems([...sortedItems]);
    setIsLoading(false);
  }, [recentlyUsed]);

  function handleFiltering(searchText: string) {
    const filteredItems = LIST_ITEMS.filter(
      (item) =>
        item.keywords.some((keyword) => keyword.includes(searchText.toLowerCase())) ||
        item.title.toLowerCase().includes(searchText.toLowerCase()),
    );
    const sortedItems = sortBySearchRelevance(filteredItems, searchText);
    setItems(sortedItems);
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={handleFiltering}>
      {items.map((item, i) => (
        <List.Item
          key={`${item.title}-${i}`}
          icon={{ source: item.icon }}
          title={item.title}
          subtitle={item.keywords.join(", ")}
          keywords={item.keywords}
          actions={
            <ActionPanel>
              <Action
                title="Paste Clipboard in Active App"
                onAction={async () => {
                  await paste(item, await Clipboard.readText());
                }}
              />
              <Action
                title="Paste Selected Text in Active App"
                onAction={async () => {
                  await paste(item, await getSelectedText());
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
