import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useNavigation } from "@raycast/api";

import {
  formatDuration,
  formatTrackDisplayTitle,
  getTrackRatingDisplayMode,
} from "./format";
import {
  getAlbumsForArtist,
  getArtists,
  getAudioPlaylists,
  getTracksForAlbum,
  getTracksForPlaylist,
} from "./plex";
import {
  PreferencesAction,
  artworkSource,
  usePlaybackActions,
} from "./shared-ui";
import { PlexSetupView } from "./plex-setup-view";
import { useLibrarySelection } from "./use-library-selection";
import type {
  AudioPlaylist,
  LibrarySection,
  MusicAlbum,
  MusicArtist,
  MusicTrack,
  PlayableItem,
} from "./types";

interface LoadState<T> {
  isLoading: boolean;
  items: T[];
  error?: string;
}

function albumAccessories(album: MusicAlbum): List.Item.Accessory[] {
  return [
    ...(album.year
      ? [
          {
            tag: {
              value: String(album.year),
              color: Color.SecondaryText,
            },
            tooltip: "Year",
          },
        ]
      : []),
    ...(album.leafCount
      ? [
          {
            tag: {
              value: `${album.leafCount} tracks`,
              color: Color.Blue,
            },
            tooltip: "Track Count",
          },
        ]
      : []),
    ...(album.duration
      ? [
          {
            tag: {
              value: formatDuration(album.duration),
              color: Color.Green,
            },
            tooltip: "Album Length",
          },
        ]
      : []),
  ];
}

function normalizeReleaseType(album: MusicAlbum): string {
  const value = `${album.releaseType ?? ""} ${album.releaseSubType ?? ""}`
    .toLowerCase()
    .trim();

  if (value.includes("compilation")) {
    return "Compilations";
  }

  if (value.includes("live")) {
    return "Live";
  }

  if (value.includes("single") || value.includes("ep")) {
    return "Singles & EPs";
  }

  if (value.includes("compilation")) {
    return "Compilations";
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

function groupAlbumsByReleaseType(
  albums: MusicAlbum[],
): [string, MusicAlbum[]][] {
  const sections = new Map<string, MusicAlbum[]>();

  for (const album of albums) {
    const section = normalizeReleaseType(album);
    const items = sections.get(section) ?? [];
    items.push(album);
    sections.set(section, items);
  }

  const order = [
    "Albums",
    "Singles & EPs",
    "Live",
    "Compilations",
    "Soundtracks",
    "Remixes",
    "Demos",
  ];

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
          <PlaybackActions
            item={props.album}
            onPlay={props.onPlay}
            onPlayNext={props.onPlayNext}
            onQueue={props.onQueue}
          />
        </ActionPanel>
      }
    />
  );
}

function useLoadItems<T>(
  loader: () => Promise<T[]>,
  dependencyKey: string,
): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({
    isLoading: true,
    items: [],
  });

  useEffect(() => {
    let cancelled = false;

    setState({ isLoading: true, items: [] });

    loader()
      .then((items) => {
        if (!cancelled) {
          setState({ isLoading: false, items });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            isLoading: false,
            items: [],
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dependencyKey]);

  return state;
}

function PlaybackActions(props: {
  item: PlayableItem;
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
}) {
  return (
    <>
      <Action
        title="Play in Plexamp"
        icon={Icon.Play}
        onAction={() => props.onPlay(props.item)}
      />
      <Action
        title="Add to Queue"
        icon={Icon.Plus}
        onAction={() => props.onQueue(props.item)}
      />
      <Action
        title="Play Next"
        icon={Icon.Forward}
        onAction={() => props.onPlayNext(props.item)}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />
      <PreferencesAction />
    </>
  );
}

function RootContent() {
  const libraries = useLibrarySelection();
  const artists = useLoadItems(
    () =>
      libraries.selectedLibrary
        ? getArtists(libraries.selectedLibrary.key)
        : Promise.resolve([]),
    libraries.selectedLibrary?.key ?? "no-library",
  );
  const playlists = useLoadItems(
    () =>
      libraries.selectedLibrary
        ? getAudioPlaylists(libraries.selectedLibrary.key)
        : Promise.resolve([]),
    `playlists-${libraries.selectedLibrary?.key ?? "no-library"}`,
  );
  const playback = usePlaybackActions();
  const { push } = useNavigation();

  const isLoading =
    libraries.isLoading ||
    artists.isLoading ||
    playlists.isLoading ||
    playback.isPerforming;
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
      navigationTitle={selectedLibrary.title}
      searchBarPlaceholder="Filter artists and playlists"
    >
      <List.Section title="Artists">
        {artists.items.map((artist) => (
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

      <List.Section title="Playlists">
        {playlists.items.map((playlist) => (
          <List.Item
            key={playlist.ratingKey}
            icon={artworkSource(playlist.thumb, Icon.List)}
            title={playlist.title}
            accessories={
              playlist.leafCount
                ? [{ text: `${playlist.leafCount} tracks` }]
                : []
            }
            actions={
              <ActionPanel>
                <Action
                  title="Browse Playlist"
                  icon={Icon.ArrowRight}
                  onAction={() =>
                    push(<PlaylistTrackList playlist={playlist} />)
                  }
                />
                <PlaybackActions
                  item={playlist}
                  onPlay={playback.play}
                  onPlayNext={playback.playNext}
                  onQueue={playback.queue}
                />
              </ActionPanel>
            }
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
            onAction={() =>
              push(
                <AlbumList
                  artist={props.artist}
                  sectionKey={props.sectionKey}
                />,
              )
            }
          />
          <PlaybackActions
            item={props.artist}
            onPlay={props.onPlay}
            onPlayNext={props.onPlayNext}
            onQueue={props.onQueue}
          />
        </ActionPanel>
      }
    />
  );
}

export function ArtistList(props: { section: LibrarySection }) {
  const artists = useLoadItems(
    () => getArtists(props.section.key),
    props.section.key,
  );
  const playback = usePlaybackActions();

  return (
    <List
      isLoading={artists.isLoading || playback.isPerforming}
      navigationTitle={props.section.title}
      searchBarPlaceholder="Filter artists"
    >
      {artists.error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load artists"
          description={artists.error}
        />
      ) : null}
      {artists.items.map((artist) => (
        <ArtistRow
          key={artist.ratingKey}
          artist={artist}
          sectionKey={props.section.key}
          onPlay={playback.play}
          onPlayNext={playback.playNext}
          onQueue={playback.queue}
        />
      ))}
    </List>
  );
}

export function AlbumList(props: { artist: MusicArtist; sectionKey: string }) {
  const albums = useLoadItems(
    () => getAlbumsForArtist(props.sectionKey, props.artist),
    `${props.sectionKey}:${props.artist.ratingKey}`,
  );
  const playback = usePlaybackActions();
  const sections = groupAlbumsByReleaseType(albums.items);

  return (
    <List
      isLoading={albums.isLoading || playback.isPerforming}
      navigationTitle={props.artist.title}
      searchBarPlaceholder="Filter albums"
    >
      {albums.error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load albums"
          description={albums.error}
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
  const tracks = useLoadItems(
    () => getTracksForAlbum(props.album),
    props.album.ratingKey,
  );
  const playback = usePlaybackActions();

  return (
    <TrackList
      title={props.album.title}
      coverPath={props.album.thumb}
      tracks={tracks.items}
      isLoading={tracks.isLoading || playback.isPerforming}
      error={tracks.error}
      onPlay={playback.play}
      onPlayNext={playback.playNext}
      onQueue={playback.queue}
    />
  );
}

export function PlaylistTrackList(props: { playlist: AudioPlaylist }) {
  const tracks = useLoadItems(
    () => getTracksForPlaylist(props.playlist),
    props.playlist.ratingKey,
  );
  const playback = usePlaybackActions();

  return (
    <TrackList
      title={props.playlist.title}
      coverPath={props.playlist.thumb}
      tracks={tracks.items}
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
    >
      {props.error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load tracks"
          description={props.error}
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
          subtitle={[track.grandparentTitle, track.parentTitle]
            .filter(Boolean)
            .join(" - ")}
          accessories={[{ text: formatDuration(track.duration) }]}
          actions={
            <ActionPanel>
              <PlaybackActions
                item={track}
                onPlay={props.onPlay}
                onPlayNext={props.onPlayNext}
                onQueue={props.onQueue}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  return <RootContent />;
}
