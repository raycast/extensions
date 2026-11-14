import { Action, ActionPanel, getPreferenceValues, Grid, Icon, LaunchProps, List, LocalStorage } from "@raycast/api";
import { useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { formatTrackDisplayTitle, getTrackRatingDisplayMode } from "./format";
import {
  getAlbumsForArtist,
  getArtists,
  getAudioPlaylists,
  getMetadataByRatingKey,
  getTracksForAlbum,
  getTracksForPlaylist,
  getTracksPage,
  resolveTrackAlbum,
  resolveTrackArtist,
  searchLibrary,
  type TrackAlbumTarget,
  type TrackArtistTarget,
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
import type { AudioPlaylist, MusicAlbum, MusicArtist, MusicTrack, PlayableItem, SearchResults } from "./types";

const TRACKS_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Shared: debounced server-side search hook
// ---------------------------------------------------------------------------

interface BrowseSearchState {
  isLoading: boolean;
  results: SearchResults;
}

function useBrowseSearch(sectionKey: string | undefined, query: string): BrowseSearchState {
  const [state, setState] = useState<BrowseSearchState>({
    isLoading: false,
    results: { tracks: [], albums: [], artists: [], playlists: [] },
  });
  const activeRequestRef = useRef(0);

  useEffect(() => {
    const requestId = ++activeRequestRef.current;

    if (!sectionKey || query.trim().length === 0) {
      setState({
        isLoading: false,
        results: { tracks: [], albums: [], artists: [], playlists: [] },
      });
      return;
    }

    setState((current) => ({ ...current, isLoading: true }));

    const timeout = setTimeout(() => {
      void searchLibrary(sectionKey, query)
        .then((results) => {
          if (requestId === activeRequestRef.current) {
            setState({ isLoading: false, results });
          }
        })
        .catch(() => {
          if (requestId === activeRequestRef.current) {
            setState({
              isLoading: false,
              results: { tracks: [], albums: [], artists: [], playlists: [] },
            });
          }
        });
    }, 250);

    return () => {
      activeRequestRef.current += 1;
      clearTimeout(timeout);
    };
  }, [query, sectionKey]);

  return state;
}

// ---------------------------------------------------------------------------
// Shared: deferred list selection
// ---------------------------------------------------------------------------

// Raycast ignores a selectedItemId that arrives in the same update as the item it points at,
// so the id is handed over one tick after the item is in the list. Once set it stays put: Raycast
// only re-applies the prop when it changes, so the user's own selection moves are not overridden.
function useDeferredSelection(items: { ratingKey: string }[], itemId?: string): string | undefined {
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const isItemPresent = itemId !== undefined && items.some((item) => item.ratingKey === itemId);

  useEffect(() => {
    if (!itemId || !isItemPresent) {
      return;
    }

    const timer = setTimeout(() => setSelectedItemId(itemId), 0);
    return () => clearTimeout(timer);
  }, [itemId, isItemPresent]);

  return selectedItemId;
}

// ---------------------------------------------------------------------------
// Shared: launch context
// ---------------------------------------------------------------------------

interface BrowseLaunchContext {
  target?: "album" | "artist";
  ratingKey?: string;
  sectionKey?: string;
  // The item to highlight in the target view: a track for "album", an album for "artist".
  selectedRatingKey?: string;
}

function getBrowseNavigationTitle(libraryName: string, serverName?: string): string {
  return `Browse: ${libraryName} on ${serverName ?? "Plex Media Server"}`;
}

// ---------------------------------------------------------------------------
// Row components
// ---------------------------------------------------------------------------

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

function AlbumRow(props: {
  album: MusicAlbum;
  sectionKey: string;
  viewMode?: "list" | "grid";
  onToggleView?: () => void;
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
}) {
  const { push } = useNavigation();

  return (
    <List.Item
      key={props.album.ratingKey}
      id={props.album.ratingKey}
      icon={artworkSource(props.album.thumb)}
      title={props.album.title}
      subtitle={props.album.parentTitle}
      accessories={albumAccessories(props.album)}
      actions={
        <ActionPanel>
          <Action
            title="Browse Tracks"
            icon={Icon.ArrowRight}
            onAction={() => push(<AlbumTrackList album={props.album} sectionKey={props.sectionKey} />)}
          />
          <PlaybackActionItems
            item={props.album}
            onPlay={props.onPlay}
            onPlayNext={props.onPlayNext}
            onQueue={props.onQueue}
            nowPlayingShortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          {props.viewMode && props.onToggleView && (
            <ToggleViewAction viewMode={props.viewMode} onToggle={props.onToggleView} />
          )}
        </ActionPanel>
      }
    />
  );
}

function PlaylistRow(props: {
  playlist: AudioPlaylist;
  sectionKey: string;
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
}) {
  const { push } = useNavigation();

  return (
    <List.Item
      key={props.playlist.ratingKey}
      icon={artworkSource(props.playlist.thumb, Icon.List)}
      title={props.playlist.title}
      accessories={props.playlist.leafCount ? [{ text: `${props.playlist.leafCount} tracks` }] : []}
      actions={
        <ActionPanel>
          <Action
            title="Browse Playlist"
            icon={Icon.ArrowRight}
            onAction={() => push(<PlaylistTrackList playlist={props.playlist} sectionKey={props.sectionKey} />)}
          />
          <PlaybackActionItems
            item={props.playlist}
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

export function TrackRow(props: {
  track: MusicTrack;
  id?: string;
  coverPath?: string;
  leadingActions?: ReactNode;
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
}) {
  const ratingDisplayMode = getTrackRatingDisplayMode();

  return (
    <List.Item
      key={props.track.ratingKey}
      id={props.id ?? props.track.ratingKey}
      icon={artworkSource(props.track.thumb ?? props.coverPath)}
      title={formatTrackDisplayTitle(props.track.title, {
        parentIndex: props.track.parentIndex,
        index: props.track.index,
        userRating: props.track.userRating,
        displayMode: ratingDisplayMode,
      })}
      subtitle={[props.track.grandparentTitle, props.track.parentTitle].filter(Boolean).join(" - ")}
      accessories={trackAccessories(props.track)}
      actions={
        <ActionPanel>
          <PlaybackActionItems
            item={props.track}
            onPlay={props.onPlay}
            onPlayNext={props.onPlayNext}
            onQueue={props.onQueue}
            nowPlayingShortcut={{ modifiers: ["cmd"], key: "n" }}
            leadingActions={props.leadingActions}
          >
            <TrackNavigationActions track={props.track} />
          </PlaybackActionItems>
        </ActionPanel>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Search results view (shared between RootContent and AlbumList)
// ---------------------------------------------------------------------------

function SearchResultsView(props: {
  sectionKey: string;
  serverName?: string;
  navigationTitle: string;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  search: BrowseSearchState;
  playlists: AudioPlaylist[];
  playback: {
    play: (item: PlayableItem) => Promise<void>;
    playNext: (item: PlayableItem) => Promise<void>;
    queue: (item: PlayableItem) => Promise<void>;
    isPerforming: boolean;
  };
}) {
  const matchingPlaylists = props.playlists.filter((playlist) =>
    playlist.title.toLowerCase().includes(props.searchText.trim().toLowerCase()),
  );
  const hasResults =
    props.search.results.artists.length > 0 ||
    props.search.results.albums.length > 0 ||
    props.search.results.tracks.length > 0 ||
    matchingPlaylists.length > 0;

  return (
    <List
      isLoading={props.search.isLoading || props.playback.isPerforming}
      filtering={false}
      navigationTitle={props.navigationTitle}
      searchBarPlaceholder="Search artists, albums, songs, and playlists"
      searchText={props.searchText}
      onSearchTextChange={props.onSearchTextChange}
      actions={
        <ActionPanel>
          <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
          <PreferencesAction />
        </ActionPanel>
      }
    >
      {props.search.results.artists.length > 0 ? (
        <List.Section title="Artists">
          {props.search.results.artists.map((artist) => (
            <ArtistRow
              key={artist.ratingKey}
              artist={artist}
              sectionKey={props.sectionKey}
              onPlay={props.playback.play}
              onPlayNext={props.playback.playNext}
              onQueue={props.playback.queue}
            />
          ))}
        </List.Section>
      ) : null}

      {props.search.results.albums.length > 0 ? (
        <List.Section title="Albums">
          {props.search.results.albums.map((album) => (
            <AlbumRow
              key={album.ratingKey}
              album={album}
              sectionKey={props.sectionKey}
              onPlay={props.playback.play}
              onPlayNext={props.playback.playNext}
              onQueue={props.playback.queue}
            />
          ))}
        </List.Section>
      ) : null}

      {props.search.results.tracks.length > 0 ? (
        <List.Section title="Songs">
          {props.search.results.tracks.map((track) => (
            <TrackRow
              key={track.ratingKey}
              track={track}
              onPlay={props.playback.play}
              onPlayNext={props.playback.playNext}
              onQueue={props.playback.queue}
            />
          ))}
        </List.Section>
      ) : null}

      {matchingPlaylists.length > 0 ? (
        <List.Section title="Playlists">
          {matchingPlaylists.map((playlist) => (
            <PlaylistRow
              key={playlist.ratingKey}
              playlist={playlist}
              sectionKey={props.sectionKey}
              onPlay={props.playback.play}
              onPlayNext={props.playback.playNext}
              onQueue={props.playback.queue}
            />
          ))}
        </List.Section>
      ) : null}

      {!props.search.isLoading && !hasResults ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results"
          description="No matching artists, albums, songs, or playlists found."
        />
      ) : null}
    </List>
  );
}

// ---------------------------------------------------------------------------
// RootContent: Browse Library (paginated artists + playlists, server-side search)
// ---------------------------------------------------------------------------

function RootContent() {
  const libraries = useLibrarySelection();
  const selectedLibrary = libraries.selectedLibrary;

  const artists = useAsyncValue(
    () => (selectedLibrary ? getArtists(selectedLibrary.key) : Promise.resolve([])),
    selectedLibrary?.key ?? "no-library",
    [] as MusicArtist[],
    selectedLibrary ? `artists-${selectedLibrary.key}` : undefined,
  );
  const playlists = useAsyncValue(
    () => (selectedLibrary ? getAudioPlaylists(selectedLibrary.key) : Promise.resolve([])),
    `playlists-${selectedLibrary?.key ?? "no-library"}`,
    [] as AudioPlaylist[],
    selectedLibrary ? `playlists-${selectedLibrary.key}` : undefined,
  );
  const playback = usePlaybackActions();

  const isLoading = libraries.isLoading || artists.isLoading || playlists.isLoading || playback.isPerforming;

  if (libraries.isLoading) {
    return <List isLoading navigationTitle="Browse Library" />;
  }

  if (libraries.error || !selectedLibrary) {
    return (
      <PlexSetupView
        navigationTitle="Browse Library"
        problem={libraries.error}
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
      {playlists.value.length > 0 ? (
        <List.Section title="Playlists">
          {playlists.value.map((playlist) => (
            <PlaylistRow
              key={playlist.ratingKey}
              playlist={playlist}
              sectionKey={selectedLibrary.key}
              onPlay={playback.play}
              onPlayNext={playback.playNext}
              onQueue={playback.queue}
            />
          ))}
        </List.Section>
      ) : null}

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

// ---------------------------------------------------------------------------
// AlbumList: albums for an artist, toggleable between list and grid view
// ---------------------------------------------------------------------------

const ALBUM_VIEW_MODE_KEY = "albumViewMode";

const RELEASE_TYPE_ORDER: Record<string, number> = {
  album: 0,
  ep: 1,
  single: 2,
  compilation: 3,
  live: 4,
  demo: 5,
  remix: 6,
};

const RELEASE_TYPE_LABELS: Record<string, string> = {
  album: "Albums",
  ep: "EPs",
  single: "Singles",
  compilation: "Compilations",
  live: "Live Albums",
  demo: "Demos",
  remix: "Remixes",
};

function groupAlbumsByReleaseType(albums: MusicAlbum[]): { type: string; label: string; albums: MusicAlbum[] }[] {
  const groups = new Map<string, MusicAlbum[]>();
  for (const album of albums) {
    const type = (album.releaseType ?? "album").toLowerCase();
    const existing = groups.get(type);
    if (existing) {
      existing.push(album);
    } else {
      groups.set(type, [album]);
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => (RELEASE_TYPE_ORDER[a] ?? 99) - (RELEASE_TYPE_ORDER[b] ?? 99))
    .map(([type, items]) => ({
      type,
      label: RELEASE_TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1) + "s",
      albums: items.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
    }));
}

function useAlbumViewMode() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    LocalStorage.getItem<string>(ALBUM_VIEW_MODE_KEY).then((stored) => {
      if (stored === "grid" || stored === "list") setViewMode(stored);
      setIsLoaded(true);
    });
  }, []);

  const toggleViewMode = useCallback(() => {
    const next = viewMode === "list" ? "grid" : "list";
    setViewMode(next);
    LocalStorage.setItem(ALBUM_VIEW_MODE_KEY, next);
  }, [viewMode]);

  return { viewMode, toggleViewMode, isLoaded };
}

function ToggleViewAction(props: { viewMode: "list" | "grid"; onToggle: () => void }) {
  return (
    <Action
      title={props.viewMode === "list" ? "Switch to Grid View" : "Switch to List View"}
      icon={props.viewMode === "list" ? Icon.AppWindowGrid3x3 : Icon.AppWindowList}
      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
      onAction={props.onToggle}
    />
  );
}

function AlbumGridItem(props: {
  album: MusicAlbum;
  sectionKey: string;
  viewMode: "list" | "grid";
  onToggleView: () => void;
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
}) {
  const { push } = useNavigation();

  return (
    <Grid.Item
      key={props.album.ratingKey}
      id={props.album.ratingKey}
      content={artworkSource(props.album.thumb)}
      title={props.album.title}
      subtitle={props.album.year?.toString()}
      keywords={[props.album.parentTitle, props.album.year?.toString()].filter(Boolean) as string[]}
      actions={
        <ActionPanel>
          <Action
            title="Browse Tracks"
            icon={Icon.ArrowRight}
            onAction={() => push(<AlbumTrackList album={props.album} sectionKey={props.sectionKey} />)}
          />
          <PlaybackActionItems
            item={props.album}
            onPlay={props.onPlay}
            onPlayNext={props.onPlayNext}
            onQueue={props.onQueue}
            nowPlayingShortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <ToggleViewAction viewMode={props.viewMode} onToggle={props.onToggleView} />
        </ActionPanel>
      }
    />
  );
}

export function AlbumList(props: { artist: MusicArtist; sectionKey: string; selectedAlbumRatingKey?: string }) {
  const albums = useAsyncValue(
    () => getAlbumsForArtist(props.sectionKey, props.artist),
    `${props.sectionKey}:${props.artist.ratingKey}`,
    [] as MusicAlbum[],
  );
  const playback = usePlaybackActions();
  const { viewMode, toggleViewMode, isLoaded } = useAlbumViewMode();

  const isLoading = !isLoaded || albums.isLoading || playback.isPerforming;
  const selectedItemId = useDeferredSelection(albums.value, props.selectedAlbumRatingKey);

  const errorView = albums.error ? (
    viewMode === "list" ? (
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
    ) : (
      <Grid.EmptyView
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
    )
  ) : null;

  const defaultActions = (
    <ActionPanel>
      <ToggleViewAction viewMode={viewMode} onToggle={toggleViewMode} />
      <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
      <PreferencesAction />
    </ActionPanel>
  );

  if (viewMode === "grid") {
    const groups = groupAlbumsByReleaseType(albums.value);
    const gridColumns = Number(getPreferenceValues<Preferences>().gridColumns) || 4;

    return (
      <Grid
        columns={gridColumns}
        aspectRatio="1"
        isLoading={isLoading}
        navigationTitle={props.artist.title}
        searchBarPlaceholder="Filter albums"
        selectedItemId={selectedItemId}
        actions={defaultActions}
      >
        {errorView}
        {groups.map((group) => (
          <Grid.Section key={group.type} title={group.label}>
            {group.albums.map((album) => (
              <AlbumGridItem
                key={album.ratingKey}
                album={album}
                sectionKey={props.sectionKey}
                viewMode={viewMode}
                onToggleView={toggleViewMode}
                onPlay={playback.play}
                onPlayNext={playback.playNext}
                onQueue={playback.queue}
              />
            ))}
          </Grid.Section>
        ))}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={props.artist.title}
      searchBarPlaceholder="Filter albums"
      selectedItemId={selectedItemId}
      actions={defaultActions}
    >
      {errorView}
      {albums.value.map((album) => (
        <AlbumRow
          key={album.ratingKey}
          album={album}
          sectionKey={props.sectionKey}
          viewMode={viewMode}
          onToggleView={toggleViewMode}
          onPlay={playback.play}
          onPlayNext={playback.playNext}
          onQueue={playback.queue}
        />
      ))}
    </List>
  );
}

// ---------------------------------------------------------------------------
// Track loading threshold: below this, load all tracks for scoped client-side
// filtering. Above this, paginate and fall back to library-wide search.
// ---------------------------------------------------------------------------

const SCOPED_SEARCH_TRACK_LIMIT = 1000;

// ---------------------------------------------------------------------------
// AlbumTrackList: albums are small — always load all tracks for scoped search
// ---------------------------------------------------------------------------

export function AlbumTrackList(props: { album: MusicAlbum; sectionKey: string; selectedTrackRatingKey?: string }) {
  const tracks = useAsyncValue(() => getTracksForAlbum(props.album), props.album.ratingKey, [] as MusicTrack[]);
  const playback = usePlaybackActions();

  return (
    <TrackList
      title={props.album.title}
      coverPath={props.album.thumb}
      tracks={tracks.value}
      isLoading={tracks.isLoading || playback.isPerforming}
      error={tracks.error}
      selectedTrackRatingKey={props.selectedTrackRatingKey}
      renderLeadingActions={(track) => (
        <>
          <Action
            title="Play Album from This Track"
            icon={Icon.PlayFilled}
            onAction={() => playback.playFromTrack(props.album, track)}
          />
          <Action title="Play Album from Start" icon={Icon.Rewind} onAction={() => playback.play(props.album)} />
        </>
      )}
      onPlay={playback.play}
      onPlayNext={playback.playNext}
      onQueue={playback.queue}
    />
  );
}

// ---------------------------------------------------------------------------
// PlaylistTrackList: threshold-based — scoped search if small, paginated
// with library-wide search fallback if large
// ---------------------------------------------------------------------------

export function PlaylistTrackList(props: { playlist: AudioPlaylist; sectionKey: string }) {
  const isSmall = (props.playlist.leafCount ?? 0) <= SCOPED_SEARCH_TRACK_LIMIT;

  if (isSmall) {
    return <SmallPlaylistTrackList playlist={props.playlist} sectionKey={props.sectionKey} />;
  }

  return <LargePlaylistTrackList playlist={props.playlist} sectionKey={props.sectionKey} />;
}

function SmallPlaylistTrackList(props: { playlist: AudioPlaylist; sectionKey: string }) {
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

function LargePlaylistTrackList(props: { playlist: AudioPlaylist; sectionKey: string }) {
  const [searchText, setSearchText] = useState("");
  const isSearching = searchText.trim().length > 0;

  const {
    data: tracks,
    isLoading: tracksLoading,
    pagination,
  } = usePromise(
    (browseKey: string) => async (options: { page: number }) => {
      const { items, totalSize } = await getTracksPage(browseKey, options.page * TRACKS_PAGE_SIZE, TRACKS_PAGE_SIZE);
      return { data: items, hasMore: options.page * TRACKS_PAGE_SIZE + items.length < totalSize };
    },
    [props.playlist.browseKey],
  );

  const search = useBrowseSearch(props.sectionKey, searchText);
  const playback = usePlaybackActions();

  const onSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  if (isSearching) {
    return (
      <SearchResultsView
        sectionKey={props.sectionKey}
        navigationTitle={props.playlist.title}
        searchText={searchText}
        onSearchTextChange={onSearchTextChange}
        search={search}
        playlists={[]}
        playback={playback}
      />
    );
  }

  return (
    <PaginatedTrackList
      title={props.playlist.title}
      coverPath={props.playlist.thumb}
      tracks={tracks ?? []}
      isLoading={tracksLoading || playback.isPerforming}
      pagination={pagination}
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      onPlay={playback.play}
      onPlayNext={playback.playNext}
      onQueue={playback.queue}
    />
  );
}

// ---------------------------------------------------------------------------
// Shared: unique item ids for track lists
// ---------------------------------------------------------------------------

// A playlist can hold the same track more than once, and Raycast needs every item id in a list to be
// unique. The first occurrence keeps its bare rating key, which album pre-selection targets; repeats get
// an occurrence suffix.
function withUniqueItemIds(tracks: MusicTrack[]): { track: MusicTrack; itemId: string }[] {
  const occurrences = new Map<string, number>();

  return tracks.map((track) => {
    const occurrence = occurrences.get(track.ratingKey) ?? 0;
    occurrences.set(track.ratingKey, occurrence + 1);
    return { track, itemId: occurrence === 0 ? track.ratingKey : `${track.ratingKey}:${occurrence}` };
  });
}

// ---------------------------------------------------------------------------
// TrackList: all tracks loaded — uses Raycast built-in client-side filtering
// ---------------------------------------------------------------------------

function TrackList(props: {
  title: string;
  coverPath?: string;
  tracks: MusicTrack[];
  isLoading: boolean;
  error?: string;
  selectedTrackRatingKey?: string;
  renderLeadingActions?: (track: MusicTrack) => ReactNode;
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
}) {
  const selectedItemId = useDeferredSelection(props.tracks, props.selectedTrackRatingKey);

  return (
    <List
      isLoading={props.isLoading}
      navigationTitle={props.title}
      searchBarPlaceholder="Filter tracks"
      selectedItemId={selectedItemId}
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
      {withUniqueItemIds(props.tracks).map(({ track, itemId }) => (
        <TrackRow
          key={itemId}
          id={itemId}
          track={track}
          coverPath={props.coverPath}
          leadingActions={props.renderLeadingActions?.(track)}
          onPlay={props.onPlay}
          onPlayNext={props.onPlayNext}
          onQueue={props.onQueue}
        />
      ))}
    </List>
  );
}

// ---------------------------------------------------------------------------
// PaginatedTrackList: large track lists — paginated, no client-side filtering
// ---------------------------------------------------------------------------

function PaginatedTrackList(props: {
  title: string;
  coverPath?: string;
  tracks: MusicTrack[];
  isLoading: boolean;
  pagination?: { pageSize: number; hasMore: boolean; onLoadMore: () => void };
  searchText?: string;
  onSearchTextChange?: (text: string) => void;
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
}) {
  return (
    <List
      isLoading={props.isLoading}
      filtering={false}
      navigationTitle={props.title}
      searchBarPlaceholder="Search tracks"
      searchText={props.searchText}
      onSearchTextChange={props.onSearchTextChange}
      pagination={props.pagination}
      actions={
        <ActionPanel>
          <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
          <PreferencesAction />
        </ActionPanel>
      }
    >
      {withUniqueItemIds(props.tracks).map(({ track, itemId }) => (
        <TrackRow
          key={itemId}
          id={itemId}
          track={track}
          coverPath={props.coverPath}
          onPlay={props.onPlay}
          onPlayNext={props.onPlayNext}
          onQueue={props.onQueue}
        />
      ))}
    </List>
  );
}

// ---------------------------------------------------------------------------
// Shared: loading / error placeholder
// ---------------------------------------------------------------------------

function PendingView(props: {
  navigationTitle: string;
  loadingTitle: string;
  errorTitle: string;
  icon: Icon;
  isLoading: boolean;
  error?: string;
}) {
  const actions = (
    <ActionPanel>
      <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
      <PreferencesAction />
    </ActionPanel>
  );

  return (
    <List isLoading={props.isLoading} navigationTitle={props.navigationTitle} actions={actions}>
      <List.EmptyView
        icon={props.error ? Icon.ExclamationMark : props.icon}
        title={props.error ? props.errorTitle : props.loadingTitle}
        description={props.error}
        actions={actions}
      />
    </List>
  );
}

// ---------------------------------------------------------------------------
// Deep-link launch views
// ---------------------------------------------------------------------------

function LaunchAlbumView(props: { ratingKey: string; sectionKey: string; selectedTrackRatingKey?: string }) {
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
    return (
      <AlbumTrackList
        album={album.value}
        sectionKey={props.sectionKey}
        selectedTrackRatingKey={props.selectedTrackRatingKey}
      />
    );
  }

  return (
    <PendingView
      navigationTitle="Browse Album"
      loadingTitle="Loading album"
      errorTitle="Unable to load album"
      icon={Icon.Music}
      isLoading={album.isLoading}
      error={album.error}
    />
  );
}

function LaunchArtistView(props: { ratingKey: string; sectionKey: string; selectedAlbumRatingKey?: string }) {
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
    return (
      <AlbumList
        artist={artist.value}
        sectionKey={props.sectionKey}
        selectedAlbumRatingKey={props.selectedAlbumRatingKey}
      />
    );
  }

  return (
    <PendingView
      navigationTitle="Browse Artist"
      loadingTitle="Loading artist"
      errorTitle="Unable to load artist"
      icon={Icon.Person}
      isLoading={artist.isLoading}
      error={artist.error}
    />
  );
}

// ---------------------------------------------------------------------------
// Track navigation: Go to Album / Go to Artist from any track row
// ---------------------------------------------------------------------------

function TrackAlbumView(props: { track: MusicTrack }) {
  const target = useAsyncValue(
    () => resolveTrackAlbum(props.track),
    props.track.ratingKey,
    undefined as TrackAlbumTarget | undefined,
  );

  if (target.value) {
    return (
      <AlbumTrackList
        album={target.value.album}
        sectionKey={target.value.sectionKey}
        selectedTrackRatingKey={props.track.ratingKey}
      />
    );
  }

  return (
    <PendingView
      navigationTitle="Go to Album"
      loadingTitle="Loading album"
      errorTitle="Unable to load album"
      icon={Icon.Music}
      isLoading={target.isLoading}
      error={target.error}
    />
  );
}

function TrackArtistView(props: { track: MusicTrack }) {
  const target = useAsyncValue(
    () => resolveTrackArtist(props.track),
    props.track.ratingKey,
    undefined as TrackArtistTarget | undefined,
  );

  if (target.value) {
    return (
      <AlbumList
        artist={target.value.artist}
        sectionKey={target.value.sectionKey}
        selectedAlbumRatingKey={target.value.albumRatingKey}
      />
    );
  }

  return (
    <PendingView
      navigationTitle="Go to Artist"
      loadingTitle="Loading artist"
      errorTitle="Unable to load artist"
      icon={Icon.Person}
      isLoading={target.isLoading}
      error={target.error}
    />
  );
}

export function TrackNavigationActions(props: { track: MusicTrack }) {
  const { push } = useNavigation();

  return (
    <>
      <Action
        title="Go to Album"
        icon={Icon.Music}
        shortcut={{ modifiers: ["cmd"], key: "g" }}
        onAction={() => push(<TrackAlbumView track={props.track} />)}
      />
      <Action
        title="Go to Artist"
        icon={Icon.Person}
        shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
        onAction={() => push(<TrackArtistView track={props.track} />)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Command entry point
// ---------------------------------------------------------------------------

export default function Command(props: LaunchProps<{ launchContext?: BrowseLaunchContext }>) {
  const context = props.launchContext;

  if (context?.target === "album" && context.ratingKey && context.sectionKey) {
    return (
      <LaunchAlbumView
        ratingKey={context.ratingKey}
        sectionKey={context.sectionKey}
        selectedTrackRatingKey={context.selectedRatingKey}
      />
    );
  }

  if (context?.target === "artist" && context.ratingKey && context.sectionKey) {
    return (
      <LaunchArtistView
        ratingKey={context.ratingKey}
        sectionKey={context.sectionKey}
        selectedAlbumRatingKey={context.selectedRatingKey}
      />
    );
  }

  return <RootContent />;
}
