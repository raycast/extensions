import {
  MenuBarExtra,
  Icon,
  open,
  showToast,
  Toast,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { DocEntry, loadEntries, categoryIcon } from "./shared";

const RECENT_KEY = "cocart-recent-docs";
const MAX_RECENT = 8;

interface RecentItem {
  title: string;
  url: string;
  category: string;
}

async function getRecentItems(): Promise<RecentItem[]> {
  const stored = await LocalStorage.getItem<string>(RECENT_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

async function addRecentItem(item: RecentItem): Promise<void> {
  const recent = await getRecentItems();
  const filtered = recent.filter((r) => r.url !== item.url);
  filtered.unshift(item);
  await LocalStorage.setItem(
    RECENT_KEY,
    JSON.stringify(filtered.slice(0, MAX_RECENT)),
  );
}

export default function CoCartMenuBar() {
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadEntries(), getRecentItems()])
      .then(([docs, recent]) => {
        setEntries(docs);
        setRecentItems(recent);
      })
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load CoCart docs",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const quickAccess = entries
    .filter(
      (e) =>
        ["Getting Started", "Cart", "Products", "Sessions"].includes(
          e.category,
        ) && e.version !== "v1",
    )
    .slice(0, 10);

  async function openDoc(entry: {
    title: string;
    url: string;
    category: string;
  }) {
    const url = entry.url.replace(/\.md$/, "");
    await addRecentItem({ title: entry.title, url, category: entry.category });
    setRecentItems(await getRecentItems());
    await open(url);
  }

  return (
    <MenuBarExtra icon={Icon.Book} tooltip="CoCart Docs" isLoading={isLoading}>
      {recentItems.length > 0 && (
        <MenuBarExtra.Section title="Recently Viewed">
          {recentItems.map((item) => (
            <MenuBarExtra.Item
              key={item.url}
              title={item.title}
              icon={categoryIcon(item.category)}
              onAction={() => open(item.url)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title="Quick Access">
        {quickAccess.map((entry) => (
          <MenuBarExtra.Item
            key={entry.url}
            title={entry.title}
            icon={categoryIcon(entry.category)}
            onAction={() => openDoc(entry)}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Documentation"
          icon={Icon.Globe}
          onAction={() => open("https://docs.cocartapi.com")}
        />
        <MenuBarExtra.Item
          title="Open GitHub"
          icon={Icon.Link}
          onAction={() => open("https://github.com/cocart-headless/cocart")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
