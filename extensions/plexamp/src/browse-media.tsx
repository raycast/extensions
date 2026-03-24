import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { useNavigation } from "@raycast/api";

import { formatTrackDisplayTitle, getTrackRatingDisplayMode } from "./format";
import {
  getAlbumsForArtist,
  getArtists,
  getAudioPlaylists,
  getMetadataByRatingKey,
  getTracksForAlbum,
  getTracksForPlaylist,
} from "./plex";
import {
  NowPlayingAction,
  PlaybackActionItems,
  PreferencesAction,
  albumAccessories,
  artworkSource,
  trackAccessories,
  usePlaybackActions,
} from "./shared-ui";
import { PlexSetupView } from "./plex-setup-view";
import { useAsyncValue } from "./use-async-value";
import { useLibrarySelection } from "./use-library-selection";
import type { AudioPlaylist, MusicAlbum, MusicArtist, MusicTrack, PlayableItem } from "./types";

interface BrowseLaunchContext {
  target?: "album" | "artist";
  ratingKey?: string;
  sectionKey?: string;
}

function getBrowseNavigationTitle(libraryName: string, serverName?: string): string {
  return `Browse: ${libraryName} on ${serverName ?? "Plex Media Server"}`;
}

function normalizeReleaseType(album: MusicAlbum): string {
  const value = `${album.releaseType ?? ""} ${album.releaseSubType ?? ""}`.toLowerCase().trim();

  if (value.includes("compilation")) {
    return "Compilations";
  }

  if (value.includes("live")) {
    return "Live";
  }

  if (value.includes("single") || value.includes("ep")) {
    return "Singles & EPs";
  }

  if (value.includes("soundtrack")) {
    return "Soundtracks";
  }

  if (value.includes("remix")) {
    return "Remixes";
  }

  if (value.includes("demo")) {
    return "Demos";
  }

  return "Albums";
}

function groupAlbumsByReleaseType(albums: MusicAlbum[]): [string, MusicAlbum[]][] {
  const sections = new Map<string, MusicAlbum[]>();

  for (const album of albums) {
    const section = normalizeReleaseType(album);
    const items = sections.get(section) ?? [];
    items.push(album);
    sections.set(section, items);
  }

  const order = ["Albums", "Singles & EPs", "Live", "Compilations", "Soundtracks", "Remixes", "Demos"];

  return [...sections.entries()]
    .map(
      ([title, items]) =>
        [
          title,
          [...items].sort((left, right) => {
            const yearDifference = (right.year ?? 0) - (left.year ?? 0);

            if (yearDifference !== 0) {
              return yearDifference;
            }

            return left.title.localeCompare(right.title);
          }),
        ] as [string, MusicAlbum[]],
    )
    .sort(([left], [right]) => {
      const leftIndex = order.indexOf(left);
      const rightIndex = order.indexOf(right);

      if (leftIndex === -1 && rightIndex === -1) {
        return left.localeCompare(right);
      }

      if (leftIndex === -1) {
        return 1;
      }

      if (rightIndex === -1) {
        return -1;
      }

      return leftIndex - rightIndex;
    });
}

function AlbumRow(props: {
  album: MusicAlbum;
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
}) {
  const { push } = useNavigation();

  return (
    <List.Item
      key={props.album.ratingKey}
      icon={artworkSource(props.album.thumb)}
      title={props.album.title}
      subtitle={props.album.parentTitle}
      accessories={albumAccessories(props.album)}
      actions={
        <ActionPanel>
          <Action
            title="Browse Tracks"
            icon={Icon.ArrowRight}
            onAction={() => push(<AlbumTrackList album={props.album} />)}
          />
          <PlaybackActionItems
            item={props.album}
            onPlay={props.onPlay}
            onPlayNext={props.onPlayNext}
            onQueue={props.onQueue}
            nowPlayingShortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    />
  );
}

function RootContent() {
  const libraries = useLibrarySelection();
  const artists = useAsyncValue(
    () => (libraries.selectedLibrary ? getArtists(libraries.selectedLibrary.key) : Promise.resolve([])),
    libraries.selectedLibrary?.key ?? "no-library",
    [] as MusicArtist[],
  );
  const playlists = useAsyncValue(
    () => (libraries.selectedLibrary ? getAudioPlaylists(libraries.selectedLibrary.key) : Promise.resolve([])),
    `playlists-${libraries.selectedLibrary?.key ?? "no-library"}`,
    [] as AudioPlaylist[],
  );
  const playback = usePlaybackActions();
  const { push } = useNavigation();

  const isLoading = libraries.isLoading || artists.isLoading || playlists.isLoading || playback.isPerforming;
  const error = libraries.error ?? artists.error ?? playlists.error;
  const selectedLibrary = libraries.selectedLibrary;

  if (libraries.isLoading) {
    return <List isLoading navigationTitle="Browse Library" />;
  }

  if (libraries.error || !selectedLibrary) {
    return (
      <PlexSetupView
        navigationTitle="Browse Library"
        problem={error}
        onConfigured={() => {
          void libraries.reload();
        }}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={getBrowseNavigationTitle(selectedLibrary.title, libraries.selectedServerName)}
      searchBarPlaceholder="Filter artists and playlists"
      actions={
        <ActionPanel>
          <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
          <PreferencesAction />
        </ActionPanel>
      }
    >
      <List.Section title="Playlists">
        {playlists.value.map((playlist) => (
          <List.Item
            key={playlist.ratingKey}
            icon={artworkSource(playlist.thumb, Icon.List)}
            title={playlist.title}
            accessories={playlist.leafCount ? [{ text: `${playlist.leafCount} tracks` }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Browse Playlist"
                  icon={Icon.ArrowRight}
                  onAction={() => push(<PlaylistTrackList playlist={playlist} />)}
                />
                <PlaybackActionItems
                  item={playlist}
                  onPlay={playback.play}
                  onPlayNext={playback.playNext}
                  onQueue={playback.queue}
                  nowPlayingShortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Artists">
        {artists.value.map((artist) => (
          <ArtistRow
            key={artist.ratingKey}
            artist={artist}
            sectionKey={selectedLibrary.key}
            onPlay={playback.play}
            onPlayNext={playback.playNext}
            onQueue={playback.queue}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ArtistRow(props: {
  artist: MusicArtist;
  sectionKey: string;
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
}) {
  const { push } = useNavigation();

  return (
    <List.Item
      key={props.artist.ratingKey}
      icon={artworkSource(props.artist.thumb)}
      title={props.artist.title}
      subtitle={props.artist.summary}
      actions={
        <ActionPanel>
          <Action
            title="Browse Artist"
            icon={Icon.ArrowRight}
            onAction={() => push(<AlbumList artist={props.artist} sectionKey={props.sectionKey} />)}
          />
          <PlaybackActionItems
            item={props.artist}
            onPlay={props.onPlay}
            onPlayNext={props.onPlayNext}
            onQueue={props.onQueue}
            nowPlayingShortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    />
  );
}

export function AlbumList(props: { artist: MusicArtist; sectionKey: string }) {
  const albums = useAsyncValue(
    () => getAlbumsForArtist(props.sectionKey, props.artist),
    `${props.sectionKey}:${props.artist.ratingKey}`,
    [] as MusicAlbum[],
  );
  const playback = usePlaybackActions();
  const sections = groupAlbumsByReleaseType(albums.value);

  return (
    <List
      isLoading={albums.isLoading || playback.isPerforming}
      navigationTitle={props.artist.title}
      searchBarPlaceholder="Filter albums"
      actions={
        <ActionPanel>
          <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
          <PreferencesAction />
        </ActionPanel>
      }
    >
      {albums.error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load albums"
          description={albums.error}
          actions={
            <ActionPanel>
              <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
              <PreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}
      {sections.map(([title, items]) => (
        <List.Section key={title} title={title}>
          {items.map((album) => (
            <AlbumRow
              key={album.ratingKey}
              album={album}
              onPlay={playback.play}
              onPlayNext={playback.playNext}
              onQueue={playback.queue}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export function AlbumTrackList(props: { album: MusicAlbum }) {
  const tracks = useAsyncValue(() => getTracksForAlbum(props.album), props.album.ratingKey, [] as MusicTrack[]);
  const playback = usePlaybackActions();

  return (
    <TrackList
      title={props.album.title}
      coverPath={props.album.thumb}
      tracks={tracks.value}
      isLoading={tracks.isLoading || playback.isPerforming}
      error={tracks.error}
      onPlay={playback.play}
      onPlayNext={playback.playNext}
      onQueue={playback.queue}
    />
  );
}

export function PlaylistTrackList(props: { playlist: AudioPlaylist }) {
  const tracks = useAsyncValue(
    () => getTracksForPlaylist(props.playlist),
    props.playlist.ratingKey,
    [] as MusicTrack[],
  );
  const playback = usePlaybackActions();

  return (
    <TrackList
      title={props.playlist.title}
      coverPath={props.playlist.thumb}
      tracks={tracks.value}
      isLoading={tracks.isLoading || playback.isPerforming}
      error={tracks.error}
      onPlay={playback.play}
      onPlayNext={playback.playNext}
      onQueue={playback.queue}
    />
  );
}

function TrackList(props: {
  title: string;
  coverPath?: string;
  tracks: MusicTrack[];
  isLoading: boolean;
  error?: string;
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
}) {
  const ratingDisplayMode = getTrackRatingDisplayMode();

  return (
    <List
      isLoading={props.isLoading}
      navigationTitle={props.title}
      searchBarPlaceholder="Filter tracks"
      actions={
        <ActionPanel>
          <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
          <PreferencesAction />
        </ActionPanel>
      }
    >
      {props.error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load tracks"
          description={props.error}
          actions={
            <ActionPanel>
              <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
              <PreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}
      {props.tracks.map((track) => (
        <List.Item
          key={track.ratingKey}
          icon={artworkSource(track.thumb ?? props.coverPath)}
          title={formatTrackDisplayTitle(track.title, {
            parentIndex: track.parentIndex,
            index: track.index,
            userRating: track.userRating,
            displayMode: ratingDisplayMode,
          })}
          subtitle={[track.grandparentTitle, track.parentTitle].filter(Boolean).join(" - ")}
          accessories={trackAccessories(track)}
          actions={
            <ActionPanel>
              <PlaybackActionItems
                item={track}
                onPlay={props.onPlay}
                onPlayNext={props.onPlayNext}
                onQueue={props.onQueue}
                nowPlayingShortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function LaunchAlbumView(props: { ratingKey: string }) {
  const album = useAsyncValue(
    async () => {
      const metadata = await getMetadataByRatingKey(props.ratingKey);

      if (!metadata || metadata.type !== "album") {
        throw new Error("Could not load the selected album.");
      }

      return metadata;
    },
    props.ratingKey,
    undefined as MusicAlbum | undefined,
  );

  if (album.value) {
    return <AlbumTrackList album={album.value} />;
  }

  return (
    <List
      isLoading={album.isLoading}
      navigationTitle="Browse Album"
      actions={
        <ActionPanel>
          <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
          <PreferencesAction />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={album.error ? Icon.ExclamationMark : Icon.Music}
        title={album.error ? "Unable to load album" : "Loading album"}
        description={album.error}
        actions={
          <ActionPanel>
            <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
            <PreferencesAction />
          </ActionPanel>
        }
      />
    </List>
  );
}

function LaunchArtistView(props: { ratingKey: string; sectionKey: string }) {
  const artist = useAsyncValue(
    async () => {
      const metadata = await getMetadataByRatingKey(props.ratingKey);

      if (!metadata || metadata.type !== "artist") {
        throw new Error("Could not load the selected artist.");
      }

      return metadata;
    },
    props.ratingKey,
    undefined as MusicArtist | undefined,
  );

  if (artist.value) {
    return <AlbumList artist={artist.value} sectionKey={props.sectionKey} />;
  }

  return (
    <List
      isLoading={artist.isLoading}
      navigationTitle="Browse Artist"
      actions={
        <ActionPanel>
          <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
          <PreferencesAction />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={artist.error ? Icon.ExclamationMark : Icon.Person}
        title={artist.error ? "Unable to load artist" : "Loading artist"}
        description={artist.error}
        actions={
          <ActionPanel>
            <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
            <PreferencesAction />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default function Command(props: LaunchProps<{ launchContext?: BrowseLaunchContext }>) {
  const context = props.launchContext;

  if (context?.target === "album" && context.ratingKey) {
    return <LaunchAlbumView ratingKey={context.ratingKey} />;
  }

  if (context?.target === "artist" && context.ratingKey && context.sectionKey) {
    return <LaunchArtistView ratingKey={context.ratingKey} sectionKey={context.sectionKey} />;
  }

  return <RootContent />;
}
