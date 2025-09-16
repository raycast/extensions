import React, { useEffect, useState } from "react";
import { ActionPanel, Action, Grid } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type MCImage = {
  bucketType?: string | null;
  bucketPath?: string | null;
  imageUrl?: string | null;
};

type MCItem = {
  id: number;
  type: string; // e.g., "game-title", "show"
  title: string;
  slug?: string;
  images?: MCImage[];
  criticScoreSummary?: { url?: string; score?: number | string | null };
};

type MCResponse = {
  data?: { items?: MCItem[] };
};

function buildImageUrl(images?: MCImage[]): string | undefined {
  if (!images || images.length === 0) return undefined;
  const img = images[0];
  if (img.imageUrl) return img.imageUrl;
  if (img.bucketPath) {
    // Construct URL in the shape of:
    // https://www.metacritic.com/a/img/{bucketType}{bucketPath}
    // e.g., https://www.metacritic.com/a/img/catalog/provider/6/12/6-1-497372-52.jpg
    const bucketType = (img.bucketType || "catalog").replace(/^\//, "");
    const bucketPath = img.bucketPath.startsWith("/") ? img.bucketPath : `/${img.bucketPath}`;
    return `https://www.metacritic.com/a/img/${bucketType}${bucketPath}`;
  }
  return undefined;
}

function normalizeScore(score?: number | string | null): number | undefined {
  if (typeof score === "number") return score;
  if (typeof score === "string" && score.trim().length) {
    const n = Number.parseInt(score, 10);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function mediaEmojiForType(type: string | undefined): string {
  switch (type) {
    case "game-title":
      return "🎮";
    case "show":
      return "📺";
    case "movie":
      return "🎦";
    default:
      return "";
  }
}

function displayTitleForItem(item: MCItem): string {
  const mediaEmoji = mediaEmojiForType(item.type);
  const scoreNum = normalizeScore(item.criticScoreSummary?.score);
  if (scoreNum === undefined) {
    return `${mediaEmoji}${mediaEmoji ? "" : ""}${item.title}`;
  }
  const scoreEmoji = scoreNum >= 75 ? "🟢" : scoreNum >= 50 ? "🟡" : "🔴";
  return `${mediaEmoji}${mediaEmoji ? "" : ""}${scoreEmoji}${String(scoreNum)}: ${item.title}`;
}

export default function Command() {
  const [columns, setColumns] = useState(4);
  const [searchText, setSearchText] = useState("");

  // Local debounced value to avoid frequent API calls while typing
  function useDebounced(value: string, delay: number) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const t = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
  }

  const debounced = useDebounced(searchText, 300);
  const trimmed = debounced.trim();
  const url = trimmed
    ? `https://backend.metacritic.com/finder/metacritic/autosuggest/${encodeURIComponent(
        trimmed
      )}?apiKey=1MOZgmNFxvmljaQR1X9KAij9Mo4xAY3u`
    : "";

  const { isLoading, data } = useFetch<MCResponse>(url, {
    execute: trimmed.length > 0,
    keepPreviousData: true,
    parseResponse: async (response: Response) => {
      const json = (await response.json()) as MCResponse;
      return json;
    },
  });

  const items: MCItem[] = data?.data?.items ?? [];

  return (
    <Grid
      columns={columns}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Metacritic..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          value={String(columns)}
          onChange={(newValue: string) => {
            setColumns(parseInt(newValue));
          }}
        >
          <Grid.Dropdown.Item title="Large" value={"4"} />
          <Grid.Dropdown.Item title="Medium" value={"5"} />
          <Grid.Dropdown.Item title="Small" value={"6"} />
        </Grid.Dropdown>
      }
    >
      {items.length === 0 && !searchText && (
        <Grid.EmptyView
          title="Search Metacritic"
          description="Start typing to search games, movies, TV, and more"
        />
      )}
      {items.map((item) => {
        const image = buildImageUrl(item.images);
        const reviewsPath = item.criticScoreSummary?.url;
        const targetUrl = reviewsPath ? `https://www.metacritic.com${reviewsPath}` : undefined;
        const displayTitle = displayTitleForItem(item);

        return (
          <Grid.Item
            key={`${item.type}-${item.id}`}
            content={image ?? ""}
            title={displayTitle}
            actions={
              <ActionPanel>
                {targetUrl && <Action.OpenInBrowser title="Open on Metacritic" url={targetUrl} />}
                <Action.CopyToClipboard title="Copy Title and Score" content={`${item.title} (${item.criticScoreSummary?.score})`} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
