import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import {
  DocEntry,
  categoryIcon,
  loadEntries,
  refreshEntries,
  stripMdx,
} from "./shared";

const NEWS_CATEGORIES = new Set(["Updates", "Breaking Changes"]);

export default function WhatsNew() {
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    loadEntries()
      .then(setEntries)
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load CoCart docs",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const newsEntries = useMemo(() => {
    return entries.filter(
      (e) =>
        NEWS_CATEGORIES.has(e.category) &&
        (selectedCategory === "all" || e.category === selectedCategory),
    );
  }, [entries, selectedCategory]);

  const grouped = useMemo(() => {
    const groups: Record<string, DocEntry[]> = {};
    for (const entry of newsEntries) {
      if (!groups[entry.category]) groups[entry.category] = [];
      groups[entry.category].push(entry);
    }
    return Object.entries(groups);
  }, [newsEntries]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search updates and changes..."
      searchBarAccessory={
        <List.Dropdown tooltip="Category" onChange={setSelectedCategory}>
          <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
          <List.Dropdown.Item
            title="Updates"
            value="Updates"
            icon={Icon.Bell}
          />
          <List.Dropdown.Item
            title="Breaking Changes"
            value="Breaking Changes"
            icon={Icon.Warning}
          />
        </List.Dropdown>
      }
    >
      {grouped.map(([category, items]) => (
        <List.Section
          key={category}
          title={category}
          subtitle={`${items.length}`}
        >
          {items.map((entry) => (
            <List.Item
              key={entry.url}
              title={entry.title}
              icon={categoryIcon(entry.category)}
              detail={<List.Item.Detail markdown={stripMdx(entry.content)} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={entry.url.replace(/\.md$/, "")}
                    title="Open in Browser"
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={entry.url.replace(/\.md$/, "")}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={entry.title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  />
                  <Action
                    title="Refresh Cache"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={async () => {
                      setIsLoading(true);
                      try {
                        const parsed = await refreshEntries();
                        setEntries(parsed);
                        showToast({
                          style: Toast.Style.Success,
                          title: "Cache refreshed",
                        });
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to refresh",
                          message:
                            error instanceof Error
                              ? error.message
                              : "Unknown error",
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
