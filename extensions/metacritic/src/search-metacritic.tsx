import React, { useEffect, useState } from "react";
import { ActionPanel, Action, Grid, Detail } from "@raycast/api";
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
  rating?: string | null; // e.g., E, PG-13
  releaseDate?: string | null; // ISO or YYYY-MM-DD
  premiereYear?: number | null;
  genres?: { id?: number | null; name?: string | null }[];
  platforms?: { id?: number | null; name?: string | null }[];
  seasonCount?: number | null;
  description?: string | null;
  duration?: string | number | null; // e.g., minutes for movies/episodes
  mustSee?: boolean | null;
  mustWatch?: boolean | null;
  mustPlay?: boolean | null;
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

function mediaTypeLabel(type: string | undefined): string {
  switch (type) {
    case "game-title":
      return "Video Game";
    case "show":
      return "TV Show";
    case "movie":
      return "Movie";
    default:
      return type ? type : "";
  }
}

function displayTitleForItem(item: MCItem): string {
  const mediaEmoji = mediaEmojiForType(item.type);
  const scoreNum = normalizeScore(item.criticScoreSummary?.score);
  if (scoreNum === undefined) {
    return `${mediaEmoji}${item.title}`;
  }
  const scoreEmoji = scoreNum >= 75 ? "🟢" : scoreNum >= 50 ? "🟡" : "🔴";
  return `${mediaEmoji}${scoreEmoji}${String(scoreNum)}: ${item.title}`;
}

function joinNames(items?: { name?: string | null }[], fallback = "—"): string {
  if (!items || items.length === 0) return fallback;
  const names = items
    .map((g) => (g?.name || "").trim())
    .filter((n) => n.length > 0);
  return names.length ? names.join(", ") : fallback;
}

function formatReleaseDate(item: MCItem): string | undefined {
  if (item.releaseDate) return item.releaseDate;
  if (item.premiereYear) return String(item.premiereYear);
  return undefined;
}

function formatDuration(d?: string | number | null): string | undefined {
  if (d == null) return undefined;
  if (typeof d === "number") {
    // Assume minutes if a number
    return `${d} min`;
  }
  const trimmed = d.trim();
  return trimmed.length ? trimmed : undefined;
}

function badgesMarkdown(item: MCItem): string {
  const badges: string[] = [];
  if (item.mustPlay) badges.push("`MUST PLAY`");
  if (item.mustWatch) badges.push("`MUST WATCH`");
  if (item.mustSee) badges.push("`MUST SEE`");
  return badges.join(" ");
}

function scoreColor(score?: number): string {
  if (score == null) return "gray";
  if (score >= 75) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

function DetailView({ item }: { item: MCItem }) {
  const image = buildImageUrl(item.images);
  const scoreNum = normalizeScore(item.criticScoreSummary?.score);
  const typeLabel = mediaTypeLabel(item.type);
  const release = formatReleaseDate(item);
  const genres = joinNames(item.genres);
  const platforms = joinNames(item.platforms);
  const duration = formatDuration(item.duration);
  const badgeLine = badgesMarkdown(item);
  const reviewsPath = item.criticScoreSummary?.url;
  const targetUrl = reviewsPath ? `https://www.metacritic.com${reviewsPath}` : undefined;

  const mdParts: string[] = [];
  if (image) mdParts.push(`![](${image})`);
  if (item.description) mdParts.push("\n" + item.description + "\n");
  if (badgeLine) mdParts.push(badgeLine);
  const markdown = mdParts.join("\n\n");

  return (
    <Detail
      markdown={markdown}
      metadata={<Detail.Metadata>
        <Detail.Metadata.Label title="Title" text={item.title} />
        {typeLabel && <Detail.Metadata.Label title="Type" text={typeLabel} />}
        {scoreNum !== undefined && (
          <Detail.Metadata.TagList title="Score">
            <Detail.Metadata.TagList.Item text={`${scoreNum}`} color={scoreColor(scoreNum)} />
          </Detail.Metadata.TagList>
        )}
        {release && <Detail.Metadata.Label title="Release" text={release} />}
        {genres && <Detail.Metadata.Label title="Genres" text={genres} />}
        {platforms && <Detail.Metadata.Label title="Platforms" text={platforms} />}
        {item.rating && <Detail.Metadata.Label title="Rating" text={item.rating} />}
        {item.seasonCount && item.seasonCount > 0 && (
          <Detail.Metadata.Label title="Season Count" text={String(item.seasonCount)} />
        )}
        {duration && <Detail.Metadata.Label title="Duration" text={duration} />}
      </Detail.Metadata>}
      actions={<ActionPanel>
        {targetUrl && <Action.OpenInBrowser title="Open on Metacritic" url={targetUrl} />}
        <Action.CopyToClipboard title="Copy Title and Score" content={`${item.title} (${item.criticScoreSummary?.score ?? "N/A"})`} />
      </ActionPanel>}
    />
  );
}

export default function Command() {
  const [columns, setColumns] = useState(4);
  const [searchText, setSearchText] = useState("");
  const trimmed = searchText.trim();
  const url = trimmed
    ? `https://backend.metacritic.com/finder/metacritic/search/${encodeURIComponent(
        trimmed
      )}/web?apiKey=1MOZgmNFxvmljaQR1X9KAij9Mo4xAY3u&limit=32&offset=0`
    : "";

  const { isLoading, data } = useFetch<MCResponse>(url, {
    execute: trimmed.length > 0,
    keepPreviousData: true,
    parseResponse: async (response: Response) => {
      const json = (await response.json()) as MCResponse;
      return json;
    },
  });

  // Filter out people results; we only want media (games, movies, shows, etc.)
  const items: MCItem[] = (data?.data?.items ?? []).filter((i) => i.type !== "person");

  return (
    <Grid
      columns={columns}
      throttle
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
                <Action.Push title="Show Details" target={<DetailView item={item} />} />
                {targetUrl && <Action.OpenInBrowser title="Open on Metacritic" url={targetUrl} />}
                <Action.CopyToClipboard
                  title="Copy Title and Score"
                  content={`${item.title} (${item.criticScoreSummary?.score ?? "N/A"})`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}

