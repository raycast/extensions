import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, type ReactNode } from "react";

import { AlbumList, AlbumTrackList } from "./browse-media";
import {
  formatDuration,
  formatTrackDisplayTitle,
  getTrackRatingDisplayMode,
} from "./format";
import { searchLibrary } from "./plex";
import {
  PreferencesAction,
  artworkSource,
  librarySetupDescription,
  usePlaybackActions,
} from "./shared-ui";
import { PlexSetupView } from "./plex-setup-view";
import { useLibrarySelection } from "./use-library-selection";
import type {
  MusicAlbum,
  MusicArtist,
  MusicTrack,
  PlayableItem,
  SearchResults,
} from "./types";

interface SearchState {
  isLoading: boolean;
  results: SearchResults;
  error?: string;
}

function SearchActions(props: {
  item: PlayableItem;
  browseTarget?: ReactNode;
  browseTitle?: string;
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
}) {
  const { push } = useNavigation();

  return (
    <ActionPanel>
      {props.browseTarget && props.browseTitle ? (
        <Action
          title={props.browseTitle}
          icon={Icon.ArrowRight}
          onAction={() => push(props.browseTarget as never)}
        />
      ) : null}
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
    </ActionPanel>
  );
}

function useSearch(sectionKey: string | undefined, query: string): SearchState {
  const [state, setState] = useState<SearchState>({
    isLoading: false,
    results: { tracks: [], albums: [], artists: [] },
  });

  useEffect(() => {
    let cancelled = false;

    if (!sectionKey || query.trim().length === 0) {
      setState({
        isLoading: false,
        results: { tracks: [], albums: [], artists: [] },
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
              results: { tracks: [], albums: [], artists: [] },
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
                <SearchActions
                  item={artist}
                  browseTitle="Browse Artist"
                  browseTarget={
                    <AlbumList artist={artist} sectionKey={props.sectionKey} />
                  }
                  onPlay={props.onPlay}
                  onPlayNext={props.onPlayNext}
                  onQueue={props.onQueue}
                />
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
              accessories={[
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
              ]}
              actions={
                <SearchActions
                  item={album}
                  browseTitle="Browse Tracks"
                  browseTarget={<AlbumTrackList album={album} />}
                  onPlay={props.onPlay}
                  onPlayNext={props.onPlayNext}
                  onQueue={props.onQueue}
                />
              }
            />
          ))}
        </List.Section>
      ) : null}

      {props.tracks.length > 0 ? (
        <List.Section title="Songs">
          {props.tracks.map((track) => (
            <List.Item
              key={`track-${track.ratingKey}`}
              icon={artworkSource(track.thumb)}
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
                <SearchActions
                  item={track}
                  onPlay={props.onPlay}
                  onPlayNext={props.onPlayNext}
                  onQueue={props.onQueue}
                />
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
  const state = useSearch(librarySelection.selectedLibrary?.key, query);
  const hasResults =
    state.results.tracks.length > 0 ||
    state.results.albums.length > 0 ||
    state.results.artists.length > 0;

  if (librarySelection.isLoading) {
    return (
      <List
        isLoading
        navigationTitle="Search Library"
        searchBarPlaceholder="Search songs, albums, and artists"
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
      isLoading={
        librarySelection.isLoading || playback.isPerforming || state.isLoading
      }
      searchBarPlaceholder="Search songs, albums, and artists"
      onSearchTextChange={setQuery}
      searchText={query}
      navigationTitle={`Search: ${librarySelection.selectedLibrary.title}`}
    >
      {state.error ? (
        <List.EmptyView
          icon={Icon.Gear}
          title="Finish Plex Setup"
          description={librarySetupDescription(state.error)}
        />
      ) : null}
      {query.trim().length === 0 && librarySelection.selectedLibrary ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search by Artist, Album or Track"
        />
      ) : null}
      {!state.error &&
      query.trim().length > 0 &&
      !state.isLoading &&
      !hasResults ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results"
          description="Plex did not return any songs, albums, or artists for this search."
        />
      ) : null}
      <SearchResultsList
        sectionKey={librarySelection.selectedLibrary?.key ?? ""}
        tracks={state.results.tracks}
        albums={state.results.albums}
        artists={state.results.artists}
        onPlay={playback.play}
        onPlayNext={playback.playNext}
        onQueue={playback.queue}
      />
    </List>
  );
}
