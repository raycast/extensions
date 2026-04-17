import { List, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

type FeedItem = {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  summary: string;
  image: string | null;
  source: string;
};

// format source name (e.g. "rolling-stone" → "Rolling Stone")
function formatSourceName(source: string) {
  const overrides: Record<string, string> = {
    nme: "NME",
    kerrang: "Kerrang!",
    "rolling-stone": "Rolling Stone",
  };

  if (overrides[source]) {
    return overrides[source];
  }

  return source
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function Command() {
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  const { isLoading, data, error } = useFetch(
    "https://cdn.jsdelivr.net/gh/agilek/rss-to-json@8706137a897fcaa88795e89aec3e7aceeffc0511/data/feed.json",
    {
      keepPreviousData: true,
      parseResponse: async (response) => {
        return (await response.json()) as FeedItem[];
      },
    },
  );

  const items = data ?? [];
  const sources = ["kerrang", "nme", "billboard", "loudwire", "uncut", "rolling-stone", "pitchfork", "louder-than-war"];

  const filteredItems = items.filter((item) => {
    if (!sourceFilter) return true;
    return item.source === sourceFilter;
  });

  const searchBarAccessory = (
    <List.Dropdown tooltip="Filter by source" onChange={(value) => setSourceFilter(value === "all" ? null : value)}>
      <List.Dropdown.Item title="All" value="all" />

      {sources.map((source) => (
        <List.Dropdown.Item
          key={source}
          title={formatSourceName(source)}
          value={source}
          icon={!items.some((i) => i.source === source) ? Icon.Minus : undefined}
        />
      ))}
    </List.Dropdown>
  );

  if (error) {
    return (
      <List isLoading={false} searchBarAccessory={searchBarAccessory} searchBarPlaceholder="Search music news...">
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to load music news" description={error.message} />
      </List>
    );
  }

  if (!isLoading && filteredItems.length === 0) {
    const title = sourceFilter ? `No results for ${formatSourceName(sourceFilter)}` : "No music news found";
    const description = sourceFilter ? "Try a different source filter." : "Check back later for new stories.";

    return (
      <List isLoading={false} searchBarAccessory={searchBarAccessory} searchBarPlaceholder="Search music news...">
        <List.EmptyView icon={Icon.MagnifyingGlass} title={title} description={description} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search music news..." searchBarAccessory={searchBarAccessory}>
      {filteredItems.map((item) => (
        <List.Item
          key={item.id}
          icon={item.image ? { source: item.image, mask: Image.Mask.RoundedRectangle } : Icon.Globe}
          title={item.title}
          accessories={[
            { text: formatSourceName(item.source), tooltip: "Source" },
            { text: new Date(item.publishedAt).toLocaleDateString("en-US"), tooltip: "Published Date" },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} />
              <Action.CopyToClipboard content={item.url} title="Copy URL" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
