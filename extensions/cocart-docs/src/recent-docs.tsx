import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { RecentItem, getRecentItems, categoryIcon } from "./shared";

const SOURCE_LABELS: Record<string, string> = {
  docs: "Documentation",
  endpoints: "API Endpoints",
  hooks: "Hooks & Filters",
  errors: "Error Codes",
};

const SOURCE_ICONS: Record<string, Icon> = {
  docs: Icon.Book,
  endpoints: Icon.Code,
  hooks: Icon.Bolt,
  errors: Icon.ExclamationMark,
};

export default function RecentDocs() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState("all");

  useEffect(() => {
    setItems(getRecentItems());
    setIsLoading(false);
  }, []);

  const filtered = items.filter(
    (i) => selectedSource === "all" || i.source === selectedSource,
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent docs..."
      searchBarAccessory={
        <List.Dropdown tooltip="Source" onChange={setSelectedSource}>
          <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
          <List.Dropdown.Item
            title="Documentation"
            value="docs"
            icon={Icon.Book}
          />
          <List.Dropdown.Item
            title="API Endpoints"
            value="endpoints"
            icon={Icon.Code}
          />
          <List.Dropdown.Item
            title="Hooks & Filters"
            value="hooks"
            icon={Icon.Bolt}
          />
          <List.Dropdown.Item
            title="Error Codes"
            value="errors"
            icon={Icon.ExclamationMark}
          />
        </List.Dropdown>
      }
    >
      {filtered.length === 0 ? (
        <List.EmptyView
          title="No Recent Docs"
          description="Open docs from other CoCart commands to see them here."
          icon={Icon.Clock}
        />
      ) : (
        filtered.map((item, index) => (
          <List.Item
            key={`${item.url}-${index}`}
            title={item.title}
            subtitle={item.category}
            icon={
              categoryIcon(item.category) ||
              SOURCE_ICONS[item.source] ||
              Icon.Document
            }
            accessories={[
              { tag: SOURCE_LABELS[item.source] || item.source },
              { text: formatTimeAgo(item.timestamp) },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={item.url}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
