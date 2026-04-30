import { MenuBarExtra, Icon, open, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  DocEntry,
  loadEntries,
  categoryIcon,
  addRecentItem,
  getRecentItems,
  RecentItem,
} from "./shared";

export default function CoCartMenuBar() {
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setRecentItems(getRecentItems());
    loadEntries()
      .then((docs) => {
        setEntries(docs);
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
    addRecentItem({
      title: entry.title,
      url,
      category: entry.category,
      source: "docs",
    });
    setRecentItems(getRecentItems());
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
