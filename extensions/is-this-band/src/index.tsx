import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
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
          icon={error ? Icon.Warning : Icon.MagnifyingGlass}
          title={error ? `Couldn't reach ${genre.siteName}` : isLoading ? "Consulting the council…" : "Which band?"}
          description={
            error ??
            (isLoading
              ? `Looking up ${query.trim()} on ${genre.domain}…`
              : `Type a band name to find out whether they're ${genre.name.toLowerCase()}.`)
          }
          actions={
            error ? (
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
      accessories={[getStatusAccessory(result.status, genre)]}
      detail={<BandDetail result={result} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Verdict" content={result.verdict} />
          <Action.OpenInBrowser title={`Open on ${genre.siteName}`} url={result.url} />
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

function BandDetail({ result }: { result: BandResult }) {
  const sections = [`# ${result.verdict}`];

  if (result.commentary) {
    sections.push(
      result.tweetUrl ? result.commentary.replace(/\bTweet\b/, `[Tweet](${result.tweetUrl})`) : result.commentary,
    );
  }

  if (result.related) {
    sections.push(`---\n\nAlso [${result.related.line}](${result.related.url})`);
  }

  return <List.Item.Detail markdown={sections.join("\n\n")} />;
}

function RelatedListItem({ related }: { related: RelatedVerdict }) {
  const host = getHost(related.url);

  return (
    <List.Item
      icon={Icon.Link}
      title={related.line}
      subtitle={`Also on ${host}`}
      accessories={[{ tag: related.genre.toUpperCase() }]}
      detail={
        <List.Item.Detail
          markdown={`# ${related.line}\n\nThis band also shows up as **${related.genre}** on [${host}](${related.url}).`}
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
  const [result, setResult] = useState<BandResult>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = band.trim();

    if (!trimmed) {
      abortRef.current?.abort();
      setResult(undefined);
      setError(undefined);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(undefined);
    setResult(undefined);

    const timer = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      try {
        const nextResult = await fetchBandResult(genre, trimmed, controller.signal);
        if (!cancelled) {
          setResult(nextResult);
          setIsLoading(false);
        }
      } catch (caught) {
        if (cancelled || controller.signal.aborted) {
          return;
        }

        setResult(undefined);
        setError(caught instanceof Error ? caught.message : "Something went wrong.");
        setIsLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [genre, band, reloadToken]);

  const reload = useCallback(() => {
    setResult(undefined);
    setReloadToken((token) => token + 1);
  }, []);

  return { result, error, isLoading, reload };
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

function getStatusAccessory(status: BandStatus, genre: Genre) {
  switch (status) {
    case "yes":
      return { tag: { value: genre.name.toUpperCase(), color: genre.color } };
    case "no":
      return { tag: { value: `NOT ${genre.name.toUpperCase()}`, color: Color.SecondaryText } };
    case "unknown":
      return { tag: { value: "UNKNOWN", color: Color.Orange } };
    default:
      return { tag: { value: "UNSURE", color: Color.Orange } };
  }
}

function getHost(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
