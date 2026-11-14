import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { fetchBandResult, siteUrl } from "./lib/bandsite";
import type { BandResult, BandStatus, RelatedVerdict } from "./lib/bandsite";
import { DEFAULT_GENRE, GENRES, getGenre } from "./lib/genres";
import type { Genre } from "./lib/genres";

export default function Command() {
  const [query, setQuery] = useState("");
  const { value: storedGenreId, setValue: setStoredGenreId } = useLocalStorage<string>("genre", DEFAULT_GENRE.id);
  const genre = getGenre(storedGenreId ?? DEFAULT_GENRE.id);
  const genreId = genre.id;
  const { result, error, isLoading, reload } = useBandResult(genre, query);

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail={Boolean(result)}
      searchBarPlaceholder="Type a band name…"
      searchBarAccessory={
        <List.Dropdown tooltip="Genre" value={genreId} onChange={setStoredGenreId}>
          {GENRES.map((item) => (
            <List.Dropdown.Item key={item.id} title={item.name} value={item.id} icon={{ source: item.icon }} />
          ))}
        </List.Dropdown>
      }
      onSearchTextChange={setQuery}
    >
      {result ? (
        <>
          <BandListItem result={result} genre={genre} onReload={reload} />
          {result.related && <RelatedListItem related={result.related} />}
        </>
      ) : (
        <List.EmptyView
          icon={error && !isLoading ? Icon.Warning : Icon.MagnifyingGlass}
          title={isLoading ? "Consulting the council…" : error ? `Couldn't reach ${genre.siteName}` : "Which band?"}
          description={
            (isLoading ? `Looking up ${query.trim()} on ${genre.domain}…` : error) ??
            `Type a band name to find out whether they're ${genre.name.toLowerCase()}.`
          }
          actions={
            error && !isLoading ? (
              <ActionPanel>
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={reload} />
                <Action.OpenInBrowser title={`Open ${genre.siteName}`} url={siteUrl(genre, query)} />
              </ActionPanel>
            ) : undefined
          }
        />
      )}
    </List>
  );
}

function BandListItem({ result, genre, onReload }: { result: BandResult; genre: Genre; onReload: () => void }) {
  return (
    <List.Item
      icon={getStatusIcon(result.status, genre)}
      title={result.verdict}
      detail={<BandDetail result={result} genre={genre} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Verdict" content={result.verdict} />
          <Action.OpenInBrowser title={`Open on ${genre.siteName}`} url={result.url} />
          {result.videoUrl && <Action.OpenInBrowser title="Play Video" icon={Icon.Video} url={result.videoUrl} />}
          {result.tweetUrl && (
            <Action.OpenInBrowser title="Tweet to Expedite Ruling" icon={Icon.SpeechBubble} url={result.tweetUrl} />
          )}
          {result.related && (
            <Action.OpenInBrowser title={`Open ${capitalize(result.related.genre)} Page`} url={result.related.url} />
          )}
          <Action.CopyToClipboard title="Copy Link" content={result.url} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onReload}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}

function BandDetail({ result, genre }: { result: BandResult; genre: Genre }) {
  const sections = [`# ${result.verdict}`];

  if (result.commentary) {
    sections.push(
      result.tweetUrl ? result.commentary.replace(/\bTweet\b/, `[Tweet](${result.tweetUrl})`) : result.commentary,
    );
  }

  if (result.videoUrl) {
    const thumbnail = getVideoThumbnail(result.videoUrl);
    if (thumbnail) {
      sections.push(`[![Watch on YouTube](${thumbnail})](${result.videoUrl})`);
    }
  }

  if (result.related) {
    sections.push(`---\n\nAlso [${result.related.line}](${result.related.url})`);
  }

  const status = getStatusTag(result.status, genre);

  return (
    <List.Item.Detail
      markdown={sections.join("\n\n")}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Genre" text={genre.name} />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item text={status.value} color={status.color} />
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function RelatedListItem({ related }: { related: RelatedVerdict }) {
  const host = getHost(related.url);

  return (
    <List.Item
      icon={Icon.Link}
      title={related.line}
      subtitle={`Also on ${host}`}
      detail={
        <List.Item.Detail
          markdown={`# ${related.line}\n\nThis band also shows up as **${related.genre}** on [${host}](${related.url}).`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Genre">
                <List.Item.Detail.Metadata.TagList.Item text={related.genre.toUpperCase()} />
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={`Open ${capitalize(related.genre)} Page`} url={related.url} />
          <Action.CopyToClipboard title="Copy Line" content={related.line} />
        </ActionPanel>
      }
    />
  );
}

function useBandResult(genre: Genre, band: string) {
  const [debouncedBand, setDebouncedBand] = useState("");
  const abortable = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBand(band.trim()), 400);
    return () => clearTimeout(timer);
  }, [band]);

  const { data, error, isLoading, revalidate } = usePromise(
    (genre: Genre, band: string) => fetchBandResult(genre, band, abortable.current?.signal),
    [genre, debouncedBand],
    { abortable, execute: Boolean(debouncedBand) },
  );

  const currentBand = band.trim();
  const isDebouncing = currentBand !== debouncedBand;

  return {
    result: !isDebouncing && data?.url === siteUrl(genre, currentBand) ? data : undefined,
    error: !isDebouncing && debouncedBand ? error?.message : undefined,
    isLoading: isDebouncing ? Boolean(currentBand) : isLoading,
    reload: revalidate,
  };
}

function getStatusIcon(status: BandStatus, genre: Genre) {
  switch (status) {
    case "yes":
      return { source: genre.icon };
    case "no":
      return { source: "🤷" };
    case "unknown":
      return { source: "❓" };
    default:
      return { source: "❔" };
  }
}

function getStatusTag(status: BandStatus, genre: Genre): { value: string; color: Color } {
  switch (status) {
    case "yes":
      return { value: genre.name.toUpperCase(), color: genre.color };
    case "no":
      return { value: `NOT ${genre.name.toUpperCase()}`, color: Color.SecondaryText };
    case "unknown":
      return { value: "UNKNOWN", color: Color.Orange };
    default:
      return { value: "UNSURE", color: Color.Orange };
  }
}

function getVideoThumbnail(videoUrl: string): string | undefined {
  try {
    const videoId = new URL(videoUrl).searchParams.get("v");
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg?raycast-width=400` : undefined;
  } catch {
    return undefined;
  }
}

function getHost(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
