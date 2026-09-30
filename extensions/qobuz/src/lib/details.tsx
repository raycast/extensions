import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import type { Album, Artist, Playlist, Track } from "@kud/qobuz";
import { appLink, BRAND, deepLink, formatDuration, getClient } from "./client";
import { spotifySearchUrl, ytMusicSearchUrl } from "./resolve";

const COVER_SIZE = 220;

const cover = (image: string | undefined, title: string, subtitle?: string) =>
  [
    image ? `<img src="${image}" width="${COVER_SIZE}" height="${COVER_SIZE}" />` : "",
    `# ${title}`,
    subtitle ? `### ${subtitle}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

const ExternalActions = ({ query }: { query: string }) => (
  <ActionPanel.Section title="Find Elsewhere">
    <Action.OpenInBrowser title="Search on YouTube Music" icon={Icon.MagnifyingGlass} url={ytMusicSearchUrl(query)} />
    <Action.OpenInBrowser title="Search on Spotify" icon={Icon.MagnifyingGlass} url={spotifySearchUrl(query)} />
    <Action.CopyToClipboard title="Copy Artist & Title" content={query} />
  </ActionPanel.Section>
);

export function TrackDetail({ track }: { track: Track }) {
  const web = deepLink.track(track.id);
  const query = `${track.artist?.name ?? ""} ${track.title}`.trim();
  return (
    <Detail
      navigationTitle={track.title}
      markdown={cover(track.album?.image?.large, track.title, track.artist?.name)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Artist" text={track.artist?.name ?? "—"} />
          {track.album?.title && <Detail.Metadata.Label title="Album" text={track.album.title} />}
          <Detail.Metadata.Label title="Duration" text={formatDuration(track.duration) || "—"} />
          <Detail.Metadata.TagList title="Quality">
            <Detail.Metadata.TagList.Item text={track.hires ? "Hi-Res" : "CD"} color={BRAND} />
          </Detail.Metadata.TagList>
          {track.isrc && <Detail.Metadata.Label title="ISRC" text={track.isrc} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Qobuz">
            <Action.Open title="Play in Qobuz" target={appLink.track(track.id)} icon={Icon.Play} />
            <Action.OpenInBrowser title="Open in Browser" url={web} />
            <Action.CopyToClipboard title="Copy Qobuz Link" content={web} />
          </ActionPanel.Section>
          <ExternalActions query={query} />
        </ActionPanel>
      }
    />
  );
}

export function AlbumDetail({ album }: { album: Album }) {
  const web = deepLink.album(album.id);
  const query = `${album.artist?.name ?? ""} ${album.title}`.trim();
  return (
    <Detail
      navigationTitle={album.title}
      markdown={cover(album.image?.large, album.title, album.artist?.name)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Artist" text={album.artist?.name ?? "—"} />
          {album.genre && <Detail.Metadata.Label title="Genre" text={album.genre} />}
          {album.releaseDate && <Detail.Metadata.Label title="Released" text={album.releaseDate} />}
          {album.tracksCount ? <Detail.Metadata.Label title="Tracks" text={`${album.tracksCount}`} /> : null}
          <Detail.Metadata.TagList title="Quality">
            <Detail.Metadata.TagList.Item text={album.hires ? "Hi-Res" : "CD"} color={BRAND} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Qobuz">
            <Action.Open title="Open in Qobuz" target={appLink.album(album.id)} icon={Icon.Music} />
            <Action.OpenInBrowser title="Open in Browser" url={web} />
            <Action.CopyToClipboard title="Copy Qobuz Link" content={web} />
          </ActionPanel.Section>
          <ExternalActions query={query} />
        </ActionPanel>
      }
    />
  );
}

export function ArtistDetail({ artist }: { artist: Artist }) {
  const web = deepLink.artist(artist.id);
  return (
    <Detail
      navigationTitle={artist.name}
      markdown={cover(artist.picture, artist.name)}
      metadata={
        <Detail.Metadata>
          {artist.albumsCount ? <Detail.Metadata.Label title="Albums" text={`${artist.albumsCount}`} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Qobuz">
            <Action.Open title="Open in Qobuz" target={appLink.artist(artist.id)} icon={Icon.Music} />
            <Action.OpenInBrowser title="Open in Browser" url={web} />
            <Action.CopyToClipboard title="Copy Qobuz Link" content={web} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Find Elsewhere">
            <Action.OpenInBrowser
              title="Search on YouTube Music"
              icon={Icon.MagnifyingGlass}
              url={ytMusicSearchUrl(artist.name)}
            />
            <Action.OpenInBrowser
              title="Search on Spotify"
              icon={Icon.MagnifyingGlass}
              url={spotifySearchUrl(artist.name)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Item action panels for list/grid rows: the primary action stays in Raycast
// (push the detail view); opening externally is available as secondary actions.
export function TrackItemActions({ track }: { track: Track }) {
  const web = deepLink.track(track.id);
  return (
    <ActionPanel>
      <Action.Push title="Show Details" icon={Icon.Info} target={<TrackDetail track={track} />} />
      <Action.Open title="Play in Qobuz" target={appLink.track(track.id)} icon={Icon.Play} />
      <Action.OpenInBrowser title="Open in Browser" url={web} />
      <Action.CopyToClipboard title="Copy Share Link" content={web} />
    </ActionPanel>
  );
}

export function AlbumItemActions({ album }: { album: Album }) {
  const web = deepLink.album(album.id);
  return (
    <ActionPanel>
      <Action.Push title="Show Details" icon={Icon.Info} target={<AlbumDetail album={album} />} />
      <Action.Open title="Open in Qobuz" target={appLink.album(album.id)} icon={Icon.Music} />
      <Action.OpenInBrowser title="Open in Browser" url={web} />
      <Action.CopyToClipboard title="Copy Share Link" content={web} />
    </ActionPanel>
  );
}

export function ArtistItemActions({ artist }: { artist: Artist }) {
  const web = deepLink.artist(artist.id);
  return (
    <ActionPanel>
      <Action.Push title="Show Details" icon={Icon.Info} target={<ArtistDetail artist={artist} />} />
      <Action.Open title="Open in Qobuz" target={appLink.artist(artist.id)} icon={Icon.Music} />
      <Action.OpenInBrowser title="Open in Browser" url={web} />
      <Action.CopyToClipboard title="Copy Share Link" content={web} />
    </ActionPanel>
  );
}

// A playlist's tracklist as a List, each track drilling into its own detail —
// so browsing a playlist stays entirely inside Raycast.
export function PlaylistTracks({ playlist }: { playlist: Playlist }) {
  const { data, isLoading } = useCachedPromise(
    async (id: number) => {
      const client = await getClient();
      return (await client.playlists.get(id)).tracks ?? [];
    },
    [playlist.id],
    {
      onError: (error) => {
        showFailureToast(error, { title: "Couldn't load tracks" });
      },
    },
  );

  return (
    <List isLoading={isLoading} navigationTitle={playlist.name} searchBarPlaceholder={`Filter ${playlist.name}…`}>
      {(data ?? []).map((track, index) => (
        <List.Item
          key={`${index}-${track.id}`}
          icon={
            track.album?.image?.small ?? {
              source: Icon.Music,
              tintColor: BRAND,
            }
          }
          title={track.title}
          subtitle={track.artist?.name ?? ""}
          accessories={[{ text: formatDuration(track.duration) }]}
          actions={<TrackItemActions track={track} />}
        />
      ))}
    </List>
  );
}
