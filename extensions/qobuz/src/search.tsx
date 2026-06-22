import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  appLink,
  BRAND,
  deepLink,
  formatDuration,
  getClient,
} from "./lib/client";

const EMPTY = { query: "", albums: [], artists: [], tracks: [] };

export default function Command() {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useCachedPromise(
    async (term: string) => {
      if (!term.trim()) return EMPTY;
      const client = await getClient();
      return client.search.search(term, { limit: 20 });
    },
    [query],
    {
      keepPreviousData: true,
      onError: (error) => {
        showFailureToast(error, { title: "Qobuz search failed" });
      },
    },
  );

  const results = data ?? EMPTY;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Qobuz for albums, artists, tracks…"
      throttle
    >
      <List.Section title="Albums" subtitle={`${results.albums.length}`}>
        {results.albums.map((album) => (
          <List.Item
            key={`album-${album.id}`}
            icon={
              album.image?.small ?? { source: Icon.Music, tintColor: BRAND }
            }
            title={album.title}
            subtitle={album.artist?.name ?? ""}
            accessories={album.hires ? [{ tag: "Hi-Res" }] : []}
            actions={
              <LinkActions
                app={appLink.album(album.id)}
                web={deepLink.album(album.id)}
              />
            }
          />
        ))}
      </List.Section>

      <List.Section title="Artists" subtitle={`${results.artists.length}`}>
        {results.artists.map((artist) => (
          <List.Item
            key={`artist-${artist.id}`}
            icon={artist.picture ?? { source: Icon.Person, tintColor: BRAND }}
            title={artist.name}
            actions={
              <LinkActions
                app={appLink.artist(artist.id)}
                web={deepLink.artist(artist.id)}
              />
            }
          />
        ))}
      </List.Section>

      <List.Section title="Tracks" subtitle={`${results.tracks.length}`}>
        {results.tracks.map((track) => (
          <List.Item
            key={`track-${track.id}`}
            icon={
              track.album?.image?.small ?? {
                source: Icon.Music,
                tintColor: BRAND,
              }
            }
            title={track.title}
            subtitle={track.artist?.name ?? ""}
            accessories={[{ text: formatDuration(track.duration) }]}
            actions={
              <LinkActions
                app={appLink.track(track.id)}
                web={deepLink.track(track.id)}
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function LinkActions({ app, web }: { app: string; web: string }) {
  return (
    <ActionPanel>
      <Action.Open title="Open in Qobuz" target={app} icon={Icon.Music} />
      <Action.OpenInBrowser title="Open in Browser" url={web} />
      <Action.CopyToClipboard title="Copy Share Link" content={web} />
    </ActionPanel>
  );
}
