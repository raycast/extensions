import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import {
  DocEntry,
  addRecentItem,
  categoryIcon,
  loadEntries,
  refreshEntries,
  stripMdx,
} from "./shared";

function methodColor(method?: string): Color {
  switch (method?.toUpperCase()) {
    case "GET":
      return Color.Green;
    case "POST":
      return Color.Blue;
    case "PUT":
      return Color.Orange;
    case "PATCH":
      return Color.Yellow;
    case "DELETE":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

const API_CATEGORIES = new Set([
  "Cart",
  "Cart (Plus)",
  "Products",
  "Sessions",
  "Store",
  "User",
  "Error Codes",
  "JWT",
  "Plugins",
  "API Reference",
]);

export default function BrowseEndpoints() {
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState("v2");

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

  const endpoints = useMemo(() => {
    return entries.filter(
      (e) =>
        API_CATEGORIES.has(e.category) &&
        (selectedVersion === "all" || e.version === selectedVersion),
    );
  }, [entries, selectedVersion]);

  const grouped = useMemo(() => {
    const groups: Record<string, DocEntry[]> = {};
    for (const entry of endpoints) {
      if (!groups[entry.category]) groups[entry.category] = [];
      groups[entry.category].push(entry);
    }
    return Object.entries(groups);
  }, [endpoints]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search API endpoints..."
      searchBarAccessory={
        <List.Dropdown tooltip="API Version" onChange={setSelectedVersion}>
          <List.Dropdown.Item
            title="v2 (Stable)"
            value="v2"
            icon={Icon.CheckCircle}
          />
          <List.Dropdown.Item
            title="v1 (Legacy)"
            value="v1"
            icon={Icon.Clock}
          />
          <List.Dropdown.Item
            title="All Versions"
            value="all"
            icon={Icon.List}
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
              accessories={[
                entry.method
                  ? {
                      tag: {
                        value: entry.method,
                        color: methodColor(entry.method),
                      },
                    }
                  : { tag: entry.version },
              ]}
              detail={<List.Item.Detail markdown={stripMdx(entry.content)} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={entry.url.replace(/\.md$/, "")}
                    title="Open in Browser"
                    onOpen={() =>
                      addRecentItem({
                        title: entry.title,
                        url: entry.url.replace(/\.md$/, ""),
                        category: entry.category,
                        source: "endpoints",
                      })
                    }
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
