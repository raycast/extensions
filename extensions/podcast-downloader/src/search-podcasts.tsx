import {
  Action,
  ActionPanel,
  Icon,
  List,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { downloadEpisode } from "./download";
import { getEpisodes, hasCredentials, searchPodcasts } from "./podcast-index";
import { parseFeed } from "./rss";
import type { Episode, Podcast } from "./types";

const RECENTS_KEY = "recent-podcasts";
const PODCAST_INDEX_URL = "https://podcastindex.org";
const PODCAST_INDEX_API_URL = "https://api.podcastindex.org";
const PODCAST_INDEX_ICON = "podcast-index.png";

export default function Command() {
  const [query, setQuery] = useState("");
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [recents, setRecents] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(false);
  const configured = hasCredentials();

  useEffect(() => {
    void LocalStorage.getItem<string>(RECENTS_KEY).then(
      (value) => value && setRecents(JSON.parse(value)),
    );
  }, []);
  useEffect(() => {
    if (!configured || query.trim().length < 2 || isUrl(query)) {
      setPodcasts([]);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      void searchPodcasts(query.trim())
        .then(setPodcasts)
        .catch(showError)
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query, configured]);

  const remember = async (podcast: Podcast) => {
    const next = [
      podcast,
      ...recents.filter((item) => String(item.id) !== String(podcast.id)),
    ].slice(0, 8);
    setRecents(next);
    await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  };

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setQuery}
      throttle={false}
      searchBarPlaceholder="Podcast name or RSS feed URL…"
    >
      {isUrl(query) && (
        <List.Item
          icon={Icon.Rss}
          title="Open RSS Feed"
          subtitle={query.trim()}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Feed"
                icon={Icon.ArrowRight}
                target={<RssEpisodes url={query.trim()} onOpen={remember} />}
              />
            </ActionPanel>
          }
        />
      )}
      {!configured && !isUrl(query) && (
        <List.EmptyView
          icon={PODCAST_INDEX_ICON}
          title="Podcast Index credentials are not configured"
          description="Directory search is powered by Podcast Index and requires a free API key. Direct RSS URLs work without one."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Get Free Podcast Index API Key"
                icon={Icon.Key}
                url={PODCAST_INDEX_API_URL}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}
      {configured && !query && recents.length === 0 && (
        <List.EmptyView
          icon={PODCAST_INDEX_ICON}
          title="Search the Podcast Index"
          description="Podcast directory search is powered by the free and open Podcast Index."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Podcast Index"
                icon={Icon.Globe}
                url={PODCAST_INDEX_URL}
              />
            </ActionPanel>
          }
        />
      )}
      {!query && recents.length > 0 && (
        <List.Section title="Recent Podcasts">
          {recents.map((podcast) => (
            <PodcastItem key={podcast.id} podcast={podcast} onOpen={remember} />
          ))}
        </List.Section>
      )}
      {query && podcasts.length > 0 && (
        <List.Section title="Podcast Index Results">
          {podcasts.map((podcast) => (
            <PodcastItem key={podcast.id} podcast={podcast} onOpen={remember} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function PodcastItem({
  podcast,
  onOpen,
}: {
  podcast: Podcast;
  onOpen: (podcast: Podcast) => Promise<void>;
}) {
  return (
    <List.Item
      icon={podcast.image || Icon.Microphone}
      title={podcast.title}
      subtitle={podcast.author}
      accessories={
        podcast.episodeCount
          ? [{ text: `${podcast.episodeCount} episodes` }]
          : undefined
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Browse Episodes"
            icon={Icon.List}
            target={<Episodes podcast={podcast} onOpen={onOpen} />}
          />
          <Action
            title="Copy Latest Episode URL"
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() => void latest(podcast, onOpen, false)}
          />
          <Action
            title="Download Latest Episode"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={() => void latest(podcast, onOpen, true)}
          />
          <Action.CopyToClipboard
            title="Copy RSS Feed URL"
            content={podcast.url}
            shortcut={Keyboard.Shortcut.Common.Pin}
          />
        </ActionPanel>
      }
    />
  );
}

function Episodes({
  podcast,
  onOpen,
}: {
  podcast: Podcast;
  onOpen: (podcast: Podcast) => Promise<void>;
}) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void onOpen(podcast);
    void loadEpisodes(podcast)
      .then(setEpisodes)
      .catch(showError)
      .finally(() => setLoading(false));
  }, []);
  return (
    <EpisodeList title={podcast.title} episodes={episodes} loading={loading} />
  );
}

function RssEpisodes({
  url,
  onOpen,
}: {
  url: string;
  onOpen: (podcast: Podcast) => Promise<void>;
}) {
  const [result, setResult] = useState<{
    podcast: Podcast;
    episodes: Episode[];
  }>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void parseFeed(url)
      .then(async (value) => {
        setResult(value);
        await onOpen(value.podcast);
      })
      .catch(showError)
      .finally(() => setLoading(false));
  }, []);
  return (
    <EpisodeList
      title={result?.podcast.title ?? "RSS Feed"}
      episodes={result?.episodes ?? []}
      loading={loading}
    />
  );
}

function EpisodeList({
  title,
  episodes,
  loading,
}: {
  title: string;
  episodes: Episode[];
  loading: boolean;
}) {
  return (
    <List
      isLoading={loading}
      navigationTitle={title}
      searchBarPlaceholder="Filter episodes…"
    >
      {episodes.map((episode) => (
        <List.Item
          key={episode.id}
          icon={episode.image || Icon.Play}
          title={episode.title}
          subtitle={date(episode.datePublished)}
          accessories={
            episode.duration
              ? [{ text: duration(episode.duration) }]
              : undefined
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Audio URL"
                content={episode.enclosureUrl}
              />
              <Action
                title="Download Episode"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => downloadEpisode(episode)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function loadEpisodes(podcast: Podcast) {
  return typeof podcast.id === "number"
    ? getEpisodes(podcast.id)
    : (await parseFeed(podcast.url)).episodes;
}
async function latest(
  podcast: Podcast,
  remember: (podcast: Podcast) => Promise<void>,
  download: boolean,
) {
  try {
    await remember(podcast);
    const episode = (await loadEpisodes(podcast))[0];
    if (!episode) throw new Error("No downloadable episode found.");
    if (download) await downloadEpisode(episode);
    else {
      const { Clipboard } = await import("@raycast/api");
      await Clipboard.copy(episode.enclosureUrl);
      await showToast({
        style: Toast.Style.Success,
        title: "Latest episode URL copied",
        message: episode.title,
      });
    }
  } catch (error) {
    await showError(error);
  }
}
async function showError(error: unknown) {
  await showToast({
    style: Toast.Style.Failure,
    title: "Could not load podcasts",
    message: error instanceof Error ? error.message : String(error),
  });
}
function isUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
function date(timestamp?: number) {
  return timestamp
    ? new Date(timestamp * 1000).toLocaleDateString()
    : undefined;
}
function duration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}
