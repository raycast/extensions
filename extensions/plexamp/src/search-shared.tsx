import { ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

import { AlbumList, AlbumTrackList, PlaylistTrackList } from "./browse-media";
import { formatTrackDisplayTitle, getTrackRatingDisplayMode } from "./format";
import { getAudioPlaylists, searchLibrary } from "./plex";
import {
  NowPlayingAction,
  PlaybackActionItems,
  PreferencesAction,
  albumAccessories,
  artworkSource,
  librarySetupDescription,
  trackAccessories,
  usePlaybackActions,
} from "./shared-ui";
import { useAsyncValue } from "./use-async-value";
import { PlexSetupView } from "./plex-setup-view";
import { useLibrarySelection } from "./use-library-selection";
import type { AudioPlaylist, MusicAlbum, MusicArtist, MusicTrack, PlayableItem, SearchResults } from "./types";

interface SearchState {
  isLoading: boolean;
  results: SearchResults;
  error?: string;
}

function getSearchNavigationTitle(libraryName: string, serverName?: string): string {
  return `Search: ${libraryName} on ${serverName ?? "Plex Media Server"}`;
}

function useSearch(sectionKey: string | undefined, query: string): SearchState {
  const [state, setState] = useState<SearchState>({
    isLoading: false,
    results: { tracks: [], albums: [], artists: [], playlists: [] },
  });

  useEffect(() => {
    let cancelled = false;

    if (!sectionKey || query.trim().length === 0) {
      setState({
        isLoading: false,
        results: { tracks: [], albums: [], artists: [], playlists: [] },
      });
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({ ...current, isLoading: true, error: undefined }));

    const timeout = setTimeout(() => {
      void searchLibrary(sectionKey, query)
        .then((results) => {
          if (!cancelled) {
            setState({ isLoading: false, results });
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setState({
              isLoading: false,
              results: { tracks: [], albums: [], artists: [], playlists: [] },
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, sectionKey]);

  return state;
}

function SearchResultsList(props: {
  sectionKey: string;
  tracks: MusicTrack[];
  albums: MusicAlbum[];
  artists: MusicArtist[];
  playlists: AudioPlaylist[];
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
}) {
  const ratingDisplayMode = getTrackRatingDisplayMode();

  return (
    <>
      {props.artists.length > 0 ? (
        <List.Section title="Artists">
          {props.artists.map((artist) => (
            <List.Item
              key={`artist-${artist.ratingKey}`}
              icon={artworkSource(artist.thumb)}
              title={artist.title}
              subtitle={artist.summary}
              actions={
                <ActionPanel>
                  <PlaybackActionItems
                    item={artist}
                    browseTitle="Browse Artist"
                    browseTarget={<AlbumList artist={artist} sectionKey={props.sectionKey} />}
                    onPlay={props.onPlay}
                    onPlayNext={props.onPlayNext}
                    onQueue={props.onQueue}
                    nowPlayingShortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {props.albums.length > 0 ? (
        <List.Section title="Albums">
          {props.albums.map((album) => (
            <List.Item
              key={`album-${album.ratingKey}`}
              icon={artworkSource(album.thumb)}
              title={album.title}
              subtitle={album.parentTitle}
              accessories={albumAccessories(album)}
              actions={
                <ActionPanel>
                  <PlaybackActionItems
                    item={album}
                    browseTitle="Browse Tracks"
                    browseTarget={<AlbumTrackList album={album} sectionKey={props.sectionKey} />}
                    onPlay={props.onPlay}
                    onPlayNext={props.onPlayNext}
                    onQueue={props.onQueue}
                    nowPlayingShortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {props.tracks.length > 0 ? (
        <List.Section title="Songs">
          {props.tracks.map((track) =>
            (() => {
              return (
                <List.Item
                  key={`track-${track.ratingKey}`}
                  icon={artworkSource(track.thumb)}
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
              );
            })(),
          )}
        </List.Section>
      ) : null}

      {props.playlists.length > 0 ? (
        <List.Section title="Playlists">
          {props.playlists.map((playlist) => (
            <List.Item
              key={`playlist-${playlist.ratingKey}`}
              icon={artworkSource(playlist.thumb, Icon.List)}
              title={playlist.title}
              accessories={playlist.leafCount ? [{ text: `${playlist.leafCount} tracks` }] : []}
              actions={
                <ActionPanel>
                  <PlaybackActionItems
                    item={playlist}
                    browseTitle="Browse Playlist"
                    browseTarget={<PlaylistTrackList playlist={playlist} sectionKey={props.sectionKey} />}
                    onPlay={props.onPlay}
                    onPlayNext={props.onPlayNext}
                    onQueue={props.onQueue}
                    nowPlayingShortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </>
  );
}

export function SearchCommand() {
  const librarySelection = useLibrarySelection();
  const playback = usePlaybackActions();
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const playlists = useAsyncValue(
    () =>
      librarySelection.selectedLibrary && trimmedQuery.length > 0
        ? getAudioPlaylists(librarySelection.selectedLibrary.key)
        : Promise.resolve([]),
    `search-playlists-${
      librarySelection.selectedLibrary?.key ?? "no-library"
    }-${trimmedQuery.length > 0 ? "active" : "idle"}`,
    [] as AudioPlaylist[],
  );
  const state = useSearch(librarySelection.selectedLibrary?.key, query);
  const matchingPlaylists = playlists.value.filter((playlist) =>
    playlist.title.toLocaleLowerCase().includes(trimmedQuery.toLocaleLowerCase()),
  );
  const hasResults =
    state.results.tracks.length > 0 ||
    state.results.albums.length > 0 ||
    state.results.artists.length > 0 ||
    matchingPlaylists.length > 0;

  if (librarySelection.isLoading) {
    return (
      <List
        isLoading
        navigationTitle="Search Library"
        searchBarPlaceholder="Search songs, albums, artists, and playlists"
        onSearchTextChange={setQuery}
        searchText={query}
      />
    );
  }

  const setupProblem = librarySelection.error;

  if (setupProblem || !librarySelection.selectedLibrary) {
    return (
      <PlexSetupView
        navigationTitle="Search Library"
        problem={setupProblem}
        onConfigured={() => {
          void librarySelection.reload();
        }}
      />
    );
  }

  return (
    <List
      isLoading={librarySelection.isLoading || playlists.isLoading || playback.isPerforming || state.isLoading}
      searchBarPlaceholder="Search songs, albums, artists, and playlists"
      onSearchTextChange={setQuery}
      searchText={query}
      navigationTitle={getSearchNavigationTitle(
        librarySelection.selectedLibrary.title,
        librarySelection.selectedServerName,
      )}
      actions={
        <ActionPanel>
          <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
          <PreferencesAction />
        </ActionPanel>
      }
    >
      {state.error ? (
        <List.EmptyView
          icon={Icon.Gear}
          title="Finish Plex Setup"
          description={librarySetupDescription(state.error)}
          actions={
            <ActionPanel>
              <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
              <PreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}
      {query.trim().length === 0 && librarySelection.selectedLibrary ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search by Artist, Album, Track or Playlist"
          actions={
            <ActionPanel>
              <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
              <PreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}
      {!state.error && query.trim().length > 0 && !state.isLoading && !hasResults ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results"
          description="Plex did not return any songs, albums, artists, or playlists for this search."
          actions={
            <ActionPanel>
              <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
              <PreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}
      <SearchResultsList
        sectionKey={librarySelection.selectedLibrary?.key ?? ""}
        tracks={state.results.tracks}
        albums={state.results.albums}
        artists={state.results.artists}
        playlists={matchingPlaylists}
        onPlay={playback.play}
        onPlayNext={playback.playNext}
        onQueue={playback.queue}
      />
    </List>
  );
}
