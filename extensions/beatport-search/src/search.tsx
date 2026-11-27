import { Action, ActionPanel, Icon, List, type LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { searchBeatport, type ArtistChoice, type ChartEntry, type Results } from "./tracks";
import {
  resultSections,
  selectResult,
  updateList,
  type ResultList,
  type ResultRow,
  type ResultSection,
} from "./result-list";

export default function Command({ fallbackText }: LaunchProps) {
  return <SearchView initialText={fallbackText ?? ""} />;
}

function SearchView({ initialText, entry }: { initialText: string; entry?: ChartEntry }) {
  const [text, setText] = useState(initialText);
  const [attempt, setAttempt] = useState(0);
  const [list, setList] = useState<ResultList>();
  const query = text.trim();
  const canSearch = query.length >= 2;
  const current = canSearch && list?.query === query ? list : undefined;
  const searchUrl = "https://www.beatport.com/search?q=" + encodeURIComponent(query);

  useEffect(() => {
    setList(undefined);
    if (!canSearch) return;
    const controller = new AbortController();
    const publish = (result: Results, pending: boolean) => {
      if (!controller.signal.aborted) setList((previous) => updateList(previous, query, result, pending));
    };
    const timer = setTimeout(async () => {
      try {
        const matches = await searchBeatport(
          query,
          controller.signal,
          query === initialText ? entry : undefined,
          (initial) => publish(initial, true),
        );
        publish(matches, false);
      } catch (error) {
        if (!controller.signal.aborted)
          setList({
            query,
            sections: [],
            pending: false,
            error: error instanceof Error && /429|rate.limit/i.test(error.message) ? "limit" : "failed",
          });
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [canSearch, query, attempt, initialText, entry]);

  const loading = canSearch && !current;
  function select(id: string | null) {
    if (id) setList((previous) => selectResult(previous, query, id));
  }

  return (
    <List
      filtering={false}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="Artist or track name"
      isLoading={loading || current?.pending}
      selectedItemId={current?.selectedId}
      onSelectionChange={select}
    >
      {current?.sections.length ? (
        <ResultSections sections={current.sections} searchUrl={searchUrl} />
      ) : (
        <List.EmptyView
          icon={current?.error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
          title={
            current?.error === "limit"
              ? "Search limit reached"
              : current?.error
                ? "Search failed"
                : loading
                  ? "Searching Beatport…"
                  : canSearch
                    ? "No results found"
                    : "Search Beatport"
          }
          description={
            current?.error || loading
              ? "Press Return to search Beatport in your browser."
              : canSearch
                ? "Try a track title with the artist’s name."
                : "Enter at least two characters to search with Exa."
          }
          actions={
            canSearch ? (
              <ActionPanel>
                <Action.OpenInBrowser title="Search on Beatport" url={searchUrl} />
                {current?.error && <Action title="Retry Search" onAction={() => setAttempt((value) => value + 1)} />}
              </ActionPanel>
            ) : undefined
          }
        />
      )}
    </List>
  );
}

function ResultSections({ sections, searchUrl }: { sections: ResultSection[]; searchUrl: string }) {
  return sections.map((section) => (
    <List.Section key={section.title} title={section.title} subtitle={section.subtitle}>
      {section.rows.map((row) => (
        <BeatportRow key={row.id} row={row} searchUrl={searchUrl} />
      ))}
    </List.Section>
  ));
}

function ArtistChart({ artist, searchUrl }: { artist: ArtistChoice; searchUrl: string }) {
  const sections = resultSections({ profile: artist, chart: artist.chart, tracks: [] }, false);
  return (
    <List
      navigationTitle={artist.title + " · Artist ID " + artist.id}
      searchBarPlaceholder="Filter this artist’s chart"
    >
      <ResultSections sections={sections} searchUrl={searchUrl} />
    </List>
  );
}

function artworkIcon(url: string | undefined, fallback: Icon) {
  return url ? { source: url, fallback } : fallback;
}

function BeatportRow({ row, searchUrl }: { row: ResultRow; searchUrl: string }) {
  switch (row.kind) {
    case "artist": {
      const openProfile = <Action.OpenInBrowser title="Open Artist on Beatport" url={row.profile.url} />;
      const choose = row.choice && (
        <Action.Push
          title="View Artist Top Ten"
          icon={Icon.List}
          target={<ArtistChart artist={row.choice} searchUrl={searchUrl} />}
        />
      );
      return (
        <List.Item
          id={row.id}
          title={row.profile.title}
          subtitle={row.choice ? (row.choice.chart[0]?.title ?? "Artist profile") : "Artist profile"}
          accessories={row.choice ? [{ text: "Artist ID " + row.profile.id }] : undefined}
          icon={artworkIcon(row.profile.thumbnailUrl, Icon.Person)}
          actions={
            <ActionPanel>
              {row.keepOpenProfile && openProfile}
              {choose}
              {!row.keepOpenProfile && openProfile}
              <Action.OpenInBrowser title="Open Top Ten on Beatport" url={row.chartUrl} />
              <Action.CopyToClipboard title="Copy Artist URL" content={row.profile.url} />
            </ActionPanel>
          }
        />
      );
    }
    case "chart":
      return (
        <List.Item
          id={row.id}
          title="View Full Top Ten on Beatport"
          icon={Icon.ArrowNe}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={row.url} />
            </ActionPanel>
          }
        />
      );
    case "rank": {
      const { entry } = row;
      const trackUrl = row.resolvedTrackUrl ?? entry.trackUrl;
      return (
        <List.Item
          id={row.id}
          title={entry.title}
          subtitle={entry.credits}
          accessories={[{ text: (entry.trackUrl ? "" : "Find mix · ") + "#" + entry.rank }]}
          icon={entry.trackUrl ? artworkIcon(entry.thumbnailUrl, Icon.Music) : Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              {entry.trackUrl ? (
                <Action.OpenInBrowser title="Open on Beatport" url={entry.trackUrl} />
              ) : (
                <Action.Push
                  title="Find This Mix"
                  icon={Icon.MagnifyingGlass}
                  target={<SearchView entry={entry} initialText={entry.credits + " " + entry.title} />}
                />
              )}
              {trackUrl && <Action.CopyToClipboard title="Copy Track URL" content={trackUrl} />}
              {!entry.trackUrl && row.resolvedTrackUrl && (
                <Action.OpenInBrowser title="Open Track on Beatport" url={row.resolvedTrackUrl} />
              )}
              <Action.OpenInBrowser title="Open Chart on Beatport" url={row.chartUrl} />
            </ActionPanel>
          }
        />
      );
    }
    case "catalog":
      return (
        <List.Item
          id={row.id}
          icon={Icon.MagnifyingGlass}
          title="Search on Beatport"
          subtitle={row.matchingMixBelow ? "Matching mix below · Press ↓ to select" : "Search the full catalog"}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Search on Beatport" url={searchUrl} />
            </ActionPanel>
          }
        />
      );
    case "track": {
      const { track } = row;
      return (
        <List.Item
          id={row.id}
          title={track.title}
          subtitle={track.urlTitle ? "Name from link · Artist unconfirmed" : track.artist}
          accessories={track.releaseDetail ? [{ text: track.releaseDetail }] : undefined}
          icon={artworkIcon(track.thumbnailUrl, Icon.Music)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open on Beatport" url={track.url} />
              <Action.CopyToClipboard title="Copy Track URL" content={track.url} />
              <Action.OpenInBrowser title="Search on Beatport" url={searchUrl} />
            </ActionPanel>
          }
        />
      );
    }
  }
}
