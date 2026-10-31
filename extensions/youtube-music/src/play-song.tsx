import {
  Action,
  ActionPanel,
  Clipboard,
  Grid,
  Icon,
  LaunchProps,
  List,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  isBrowseId,
  isVideoId,
  mergeSearchResults,
  searchMusicScope,
  searchYouTube,
  searchYouTubeMusic,
  warmYouTubeMusicConnection,
  SONGS_FILTER_PARAMS,
  type BrowseKind,
  type BrowseResult,
  type SearchResult,
  type SongResult,
  type VideoResult,
} from "./search";
import { openInSelectedBrowser, runJSInYouTubeMusicTab } from "./utils";
import {
  loadCollection,
  loadLibrary,
  readLibraryDiagnostics,
  type CollectionRequest,
  type CollectionResult,
  type LibraryData,
} from "./library";

// Which catalogue the search reads. Mirrors the preference values so the stored
// choice can be used directly as state.
type Source = "both" | "ytmusic" | "youtube" | "albums" | "artists" | "playlists";

const SEARCH_PLACEHOLDER: Record<Source, string> = {
  both: "Search songs and videos",
  ytmusic: "Search YouTube Music",
  youtube: "Search YouTube",
  albums: "Search albums",
  artists: "Search artists",
  playlists: "Search playlists",
};

const EMPTY_TITLE: Record<Source, string> = {
  both: "Search YouTube Music and YouTube",
  ytmusic: "Search YouTube Music",
  youtube: "Search YouTube",
  albums: "Search albums",
  artists: "Search artists",
  playlists: "Search playlists",
};

// Why the library sections are missing, in terms the user can act on.
const LIBRARY_REASON: Record<string, string> = {
  "signed-out": "Sign in to YouTube Music in the selected browser, then reload your library.",
  "no-tab": "Open YouTube Music in the selected browser, then reload your library.",
  timeout: "Your library did not load in time. Reload it to try again.",
  unreadable: "Your library could not be read. Reload it to try again.",
};

const SOURCE_DROPDOWN_ITEMS: { title: string; value: Source; icon: Icon }[] = [
  { title: "YouTube Music + YouTube", value: "both", icon: Icon.Music },
  { title: "Songs", value: "ytmusic", icon: Icon.Music },
  { title: "Albums", value: "albums", icon: Icon.Cd },
  { title: "Artists", value: "artists", icon: Icon.Person },
  { title: "Playlists", value: "playlists", icon: Icon.List },
  { title: "YouTube", value: "youtube", icon: Icon.Video },
];

// The scopes available in the picker. "both" is deliberately omitted: it is
// not a single searchable source and gets no checkmark.
// Covers every source, including the combined one: the row above this picker
// shows the active source, so leaving one out would leave the tick missing.
const SCOPE_ROWS: { title: string; value: Source; icon: Icon }[] = [
  { title: "YouTube Music + YouTube", value: "both", icon: Icon.Globe },
  { title: "Songs", value: "ytmusic", icon: Icon.Music },
  { title: "Albums", value: "albums", icon: Icon.Cd },
  { title: "Artists", value: "artists", icon: Icon.Person },
  { title: "Playlists", value: "playlists", icon: Icon.List },
  { title: "YouTube videos", value: "youtube", icon: Icon.Video },
];

/**
 * The command can be launched straight into queueing, so a hotkey can send a
 * track to the queue without opening the action panel first.
 */
const VALID_SOURCES: Source[] = ["both", "ytmusic", "youtube", "albums", "artists", "playlists"];

function isValidSource(value: unknown): value is Source {
  return typeof value === "string" && VALID_SOURCES.includes(value as Source);
}

function libraryStatusTitle(reason: string): string {
  switch (reason) {
    case "signed-out":
      return "Not signed in";
    case "no-tab":
      return "YouTube Music isn't open";
    case "timeout":
    case "unreadable":
      return "Library did not load";
    default:
      return "Library did not load";
  }
}

function libraryStatusIcon(reason: string): Icon {
  switch (reason) {
    case "signed-out":
      return Icon.Lock;
    case "no-tab":
      return Icon.Globe;
    default:
      return Icon.ExclamationMark;
  }
}

function libraryStatusSubtitle(reason: string): string {
  switch (reason) {
    case "signed-out":
      return "Sign in to load your library. You can still search for songs above.";
    case "no-tab":
      return "Open it in the selected browser, then reload.";
    case "timeout":
    case "unreadable":
      return "Reload to try again.";
    default:
      return "Reload to try again.";
  }
}

export type PlaySongLaunchContext = { mode?: "play" | "add"; source?: Source };

function runMusic(code: string, options?: { silent?: boolean }) {
  return runJSInYouTubeMusicTab(code, { ...options, musicOnly: true });
}

const DEBOUNCE_MS = 150;
const CACHE_LIMIT = 50;
// Slow machines take a moment to swap the URL and start playback after
// `yt-navigate`; too short a window reports failure for a track that did start.
const NAVIGATION_TIMEOUT_MS = 5000;

// Every action here drives the same browser tab. Run them one at a time so a
// second action cannot replace the page or menu the first one is still reading.
let pendingAction: Promise<unknown> = Promise.resolve();

function runExclusive<T>(action: () => Promise<T>): Promise<T> {
  const result = pendingAction.then(action, action);
  pendingAction = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

// The "Add to queue" row action is labelled per locale, but its icon is the
// Material `playlist_add` glyph, which is the same everywhere.
const ADD_TO_QUEUE_ICON = "M21 6.998";
const PLAY_NEXT_ICON = "M6 2.86";

// Repeat searches are common (backspacing, retrying a typo), and a request costs
// roughly a second, so keep the last results per exact query and source.
const cache = new Map<string, SearchResult[]>();

async function searchForSource(query: string, source: Source, signal?: AbortSignal): Promise<SearchResult[]> {
  if (source === "ytmusic") return searchYouTubeMusic(query, signal);
  if (source === "youtube") return searchYouTube(query, signal);
  // The three browse scopes are one endpoint call each; the scope is the filter
  // params, and the response shape is the same for all of them.
  if (source === "albums" || source === "artists" || source === "playlists") {
    return searchMusicScope(query, source, signal);
  }

  // One dead source must not empty the list: only report a failure when both
  // requests fail.
  const [songs, videos] = await Promise.allSettled([searchYouTubeMusic(query, signal), searchYouTube(query, signal)]);
  if (songs.status === "rejected" && videos.status === "rejected") throw songs.reason;

  return mergeSearchResults(
    songs.status === "fulfilled" ? songs.value : [],
    videos.status === "fulfilled" ? videos.value : []
  );
}

/**
 * Routes the music app to a track through its own navigation event.
 *
 * Assigning `location.href` replaces the document, which trips YouTube Music's
 * beforeunload handler: app windows then ask "Leave app?" and the track does not
 * load until that prompt is dismissed.
 */
export function navigateToVideo(videoId: string): string {
  return `(function() {
  var app = document.querySelector("ytmusic-app");
  if (!app) return "no-app";
  app.dispatchEvent(new CustomEvent("yt-navigate", {
    bubbles: true,
    composed: true,
    detail: { endpoint: { watchEndpoint: { videoId: "${videoId}" } } }
  }));
  return location.href;
})();`;
}

/**
 * Opens an album, artist, or playlist page through the same navigation event.
 * Search rows for these carry a browse id instead of a video id.
 */
export function navigateToBrowse(browseId: string): string {
  return `(function() {
  var app = document.querySelector("ytmusic-app");
  if (!app) return "no-app";
  app.dispatchEvent(new CustomEvent("yt-navigate", {
    bubbles: true,
    composed: true,
    detail: { endpoint: { browseEndpoint: { browseId: "${browseId}" } } }
  }));
  return location.href;
})();`;
}

/**
 * Starts an album or playlist by its queue id. This is the endpoint the app's own
 * play button overlay carries, and it is what puts `list=` in the URL.
 */
export function playPlaylist(playlistId: string): string {
  return `(function() {
  var app = document.querySelector("ytmusic-app");
  if (!app) return "no-app";
  app.dispatchEvent(new CustomEvent("yt-navigate", {
    bubbles: true,
    composed: true,
    detail: { endpoint: { watchPlaylistEndpoint: { playlistId: "${playlistId}" } } }
  }));
  return location.href;
})();`;
}

// Used to poll after dispatching `yt-navigate`, which resolves before the URL
// and player state update.
export const currentHref = `(function() {
  return location.href;
})();`;

// The queue is client-side state, so adding to it means using the app's own
// search page and row menu. The page is opened with the same songs filter that
// produced the Play Music results: the app's default search page is a mixed
// result set, and for artist queries almost none of those songs appear on it,
// so the row would never be there to click. The track is found by its video id
// rather than by result position, and history.back() returns to the previous
// page without touching playback.
export function navigateToSearch(query: string): string {
  return `(function() {
  var app = document.querySelector("ytmusic-app");
  if (!app) return "no-app";
  app.dispatchEvent(new CustomEvent("yt-navigate", {
    bubbles: true,
    composed: true,
    detail: { endpoint: { searchEndpoint: { query: ${JSON.stringify(query)}, params: "${SONGS_FILTER_PARAMS}" } } }
  }));
  return "ok";
})();`;
}

/**
 * Opens a playlist or album page. Queueing from a browsed collection goes through
 * this rather than the search page, so the track only has to exist where the user
 * already saw it, instead of ranking in a title search.
 */
export function navigateToCollection(browseId: string): string {
  return `(function() {
  var app = document.querySelector("ytmusic-app");
  if (!app) return "no-app";
  app.dispatchEvent(new CustomEvent("yt-navigate", {
    bubbles: true,
    composed: true,
    detail: { endpoint: { browseEndpoint: { browseId: "${browseId}" } } }
  }));
  return "ok";
})();`;
}

export function findResultRow(videoId: string): string {
  return `(function() {
  var link = document.querySelector('ytmusic-responsive-list-item-renderer a[href*="v=${videoId}"]');
  return link ? "found" : "pending";
})();`;
}

export function openResultMenu(videoId: string): string {
  return `(function() {
  var link = document.querySelector('ytmusic-responsive-list-item-renderer a[href*="v=${videoId}"]');
  if (!link) return "no-row";
  var row = link.closest("ytmusic-responsive-list-item-renderer");
  var button = row && row.querySelector("ytmusic-menu-renderer button");
  if (!button) return "no-button";
  button.click();
  return "clicked";
})();`;
}

export const menuReady = `(function() {
  var items = document.querySelectorAll("ytmusic-menu-popup-renderer ytmusic-menu-service-item-renderer");
  return items.length ? "ready" : "pending";
})();`;

export function queueAction(position: "end" | "next"): string {
  const icon = position === "next" ? PLAY_NEXT_ICON : ADD_TO_QUEUE_ICON;
  const label = position === "next" ? "play next" : "add to queue";

  return `(function() {
  var items = document.querySelectorAll("ytmusic-menu-popup-renderer ytmusic-menu-service-item-renderer");
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var path = item.querySelector("svg path");
    var icon = path ? path.getAttribute("d") || "" : "";
    var label = (item.textContent || "").trim().toLowerCase();
    if (icon.indexOf("${icon}") === 0 || label.indexOf("${label}") >= 0) {
      var target = item.querySelector("yt-formatted-string") || item;
      target.click();
      return "clicked";
    }
  }
  return "no-match";
})();`;
}

export const leaveSearch = `(function() {
  var close = document.querySelector("ytmusic-menu-popup-renderer #hidden-close-button");
  if (close) close.click();
  history.back();
  return "ok";
})();`;

export default function PlaySong(props: LaunchProps<{ launchContext: PlaySongLaunchContext }>) {
  const { push } = useNavigation();
  const addMode = props.launchContext?.mode === "add";
  const launchSource = props.launchContext?.source;
  const [searchText, setSearchText] = useState("");
  const [source, setSource] = useState<Source>(
    // A deeplink can request a source, but the string is not trusted.
    () => (isValidSource(launchSource) ? launchSource : getPreferenceValues<Preferences.PlaySong>().searchSource)
  );
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultsQuery, setResultsQuery] = useState("");
  const [resultsSource, setResultsSource] = useState<Source | undefined>(undefined);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  // Bumped by Retry Search to re-run the effect for the same query and source.
  const [attempt, setAttempt] = useState(0);
  // The signed-in library, shown as sections while the search bar is empty.
  const [library, setLibrary] = useState<LibraryData | undefined>(undefined);
  const [libraryError, setLibraryError] = useState<string | undefined>(undefined);
  const query = searchText.trim();

  function retry() {
    // A cached empty or partial list would otherwise come back immediately.
    cache.delete(`${source}:${query}`);
    setAttempt((count) => count + 1);
  }

  useEffect(() => {
    warmYouTubeMusicConnection();
  }, []);

  // The library is only ever a convenience: a missing tab or a signed-out page
  // costs the sections, not the command. The reason is kept so the empty state
  // can say which of those it was instead of silently showing nothing.
  useEffect(() => {
    let cancelled = false;

    // A rejection here would leave the loading state on screen forever, so an
    // unexpected throw is reported like any other unavailable library.
    void loadLibrary()
      .catch(() => ({ status: "unavailable" as const, reason: "no-tab" }))
      .then((result) => {
        if (cancelled) return;
        if (result.status === "ready") {
          setLibrary(result.data);
          setLibraryError(undefined);
          return;
        }
        setLibraryError(result.reason);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadLibrary() {
    setLibraryError(undefined);
    const result = await loadLibrary({ force: true });
    if (result.status === "ready") {
      setLibrary(result.data);
      return;
    }

    setLibraryError(result.reason);
    await showToast({
      style: Toast.Style.Failure,
      title: "Library unavailable",
      message: LIBRARY_REASON[result.reason] ?? result.reason,
    });
  }

  // Copies what the last run actually received, so a wrong browse id can be told
  // apart from a signed-out session without another round of guessing.
  async function copyLibraryDiagnostics() {
    const info = await readLibraryDiagnostics();
    if (!info) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No diagnostics",
        message: "Open YouTube Music in the selected browser first.",
      });
      return;
    }

    await Clipboard.copy(info);
    await showHUD("Library diagnostics copied");
  }

  useEffect(() => {
    if (!query) {
      setResults([]);
      setResultsQuery("");
      setResultsSource(undefined);
      setFailure(undefined);
      setIsLoading(false);
      return;
    }

    const cacheKey = `${source}:${query}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      setResults(cached);
      setResultsQuery(query);
      setResultsSource(source);
      setFailure(undefined);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setFailure(undefined);
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const found = await searchForSource(query, source, controller.signal);
        if (cancelled) return;
        cache.set(cacheKey, found);
        if (cache.size > CACHE_LIMIT) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
        setResults(found);
        setResultsQuery(query);
        setResultsSource(source);
        setFailure(undefined);
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        // The previous query's results must not stay playable under this one.
        setResults([]);
        setResultsQuery(query);
        setResultsSource(source);
        setFailure(message);
        await showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message,
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, source, attempt]);

  // While refining a query that still starts with the previous one, keep the
  // previous results on screen instead of blanking the list for a second. A
  // source switch invalidates them, because the rows would not match the source.
  const isRefinement = resultsQuery !== "" && resultsSource === source && query.startsWith(resultsQuery);
  const visible = isRefinement || !isLoading ? results : [];
  const searchFailed = failure !== undefined && resultsQuery === query && resultsSource === source;

  const isGridSource = source === "albums" || source === "artists" || source === "playlists";

  const libraryCategories = library
    ? [
        {
          key: "recent" as const,
          title: "Recently played",
          icon: Icon.Clock,
          count: library.recent.length,
          results: library.recent,
        },
        {
          key: "liked" as const,
          title: "Liked songs",
          icon: Icon.Heart,
          count: library.liked.length,
          results: library.liked,
        },
        {
          key: "albums" as const,
          title: "Albums",
          icon: Icon.Cd,
          count: library.albums.length,
          results: library.albums,
        },
        {
          key: "artists" as const,
          title: "Artists",
          icon: Icon.Person,
          count: library.artists.length,
          results: library.artists,
        },
        {
          key: "playlists" as const,
          title: "Playlists",
          icon: Icon.List,
          count: library.playlists.length,
          results: library.playlists,
        },
      ].filter((category) => category.count > 0)
    : [];

  const retryActions = (
    <ActionPanel>
      <Action title="Retry Search" icon={Icon.ArrowClockwise} onAction={retry} />
    </ActionPanel>
  );

  const libraryActions = (
    <ActionPanel>
      <Action title="Reload Library" icon={Icon.ArrowClockwise} onAction={reloadLibrary} />
      <Action
        title="Copy Library Diagnostics"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        onAction={copyLibraryDiagnostics}
      />
    </ActionPanel>
  );

  const emptyView = !query
    ? null
    : visible.length === 0 && isLoading
    ? { title: "Searching...", description: `Looking for "${query}".` }
    : visible.length === 0 && searchFailed
    ? { icon: Icon.ExclamationMark, title: "Search failed", description: failure, actions: retryActions }
    : visible.length === 0
    ? {
        title: "No results found",
        description: "Try a different search term or source.",
        actions: retryActions,
      }
    : null;

  const searchBarAccessory = isGridSource ? (
    <Grid.Dropdown tooltip="Source" value={source} onChange={(value) => setSource(value as Source)}>
      {SOURCE_DROPDOWN_ITEMS.map((item) => (
        <Grid.Dropdown.Item key={item.value} {...item} />
      ))}
    </Grid.Dropdown>
  ) : (
    <List.Dropdown tooltip="Source" value={source} onChange={(value) => setSource(value as Source)}>
      {SOURCE_DROPDOWN_ITEMS.map((item) => (
        <List.Dropdown.Item key={item.value} {...item} />
      ))}
    </List.Dropdown>
  );

  // While the search bar is empty the root view is a short set of library
  // categories that drill down into the full list. This avoids dumping every
  // item onto one screen and keeps the search bar read as the place to find
  // something new.
  if (!query) {
    return (
      <List
        isLoading={library === undefined && libraryError === undefined}
        searchBarPlaceholder={SEARCH_PLACEHOLDER[source]}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        filtering={false}
        searchBarAccessory={
          <List.Dropdown tooltip="Source" value={source} onChange={(value) => setSource(value as Source)}>
            {SOURCE_DROPDOWN_ITEMS.map((item) => (
              <List.Dropdown.Item key={item.value} {...item} />
            ))}
          </List.Dropdown>
        }
      >
        {libraryError ? (
          <List.Section title="Your library">
            <List.Item
              title={libraryStatusTitle(libraryError)}
              subtitle={libraryStatusSubtitle(libraryError)}
              icon={libraryStatusIcon(libraryError)}
              actions={libraryActions}
            />
          </List.Section>
        ) : libraryCategories.length > 0 ? (
          <>
            <List.Section title="Your library">
              {libraryCategories.map((category) => (
                <List.Item
                  key={category.key}
                  title={category.title}
                  icon={category.icon}
                  accessories={[{ text: `${category.count}` }]}
                  actions={
                    <ActionPanel>
                      <Action
                        title={`Open ${category.title}`}
                        icon={Icon.ArrowRight}
                        onAction={() => {
                          if (category.key === "albums" || category.key === "artists" || category.key === "playlists") {
                            push(
                              <LibraryBrowseView
                                title={category.title}
                                results={category.results as BrowseResult[]}
                                addMode={addMode}
                                currentSource={source}
                                onSelectSource={setSource}
                              />
                            );
                          } else {
                            push(
                              <LibrarySongsView
                                title={category.title}
                                songs={category.results as SongResult[]}
                                addMode={addMode}
                                currentSource={source}
                                onSelectSource={setSource}
                                // Liked songs are the VLLM playlist; recently played
                                // has no collection page to queue through.
                                collectionBrowseId={category.key === "liked" ? "VLLM" : undefined}
                              />
                            );
                          }
                        }}
                      />
                      <Action
                        title="Reload Library"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={reloadLibrary}
                      />
                      <ScopeActionSection currentSource={source} onSelect={setSource} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          </>
        ) : (
          <List.EmptyView
            title={EMPTY_TITLE[source]}
            description="Type a song, video, artist, or album to play it in the selected browser."
          />
        )}
      </List>
    );
  }

  if (isGridSource) {
    return (
      <Grid
        isLoading={isLoading}
        searchBarPlaceholder={SEARCH_PLACEHOLDER[source]}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        filtering={false}
        searchBarAccessory={searchBarAccessory}
        columns={5}
        aspectRatio="1"
        fit={Grid.Fit.Fill}
        inset={Grid.Inset.Small}
      >
        {emptyView ? (
          <Grid.EmptyView {...emptyView} />
        ) : (
          visible.map((result) =>
            result.source === "browse" ? (
              <BrowseGridItem
                key={`browse-${result.id}`}
                result={result}
                addMode={addMode}
                currentSource={source}
                onSelectSource={setSource}
              />
            ) : null
          )
        )}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={SEARCH_PLACEHOLDER[source]}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={searchBarAccessory}
    >
      {emptyView ? (
        <List.EmptyView {...emptyView} />
      ) : (
        // The visible rows belong to `resultsQuery`, which can trail the typed
        // query while a refinement is in flight.
        visible.map((result) =>
          result.source === "youtube" ? (
            <VideoItem key={`youtube-${result.id}`} video={result} currentSource={source} onSelectSource={setSource} />
          ) : result.source === "browse" ? (
            <BrowseItem
              key={`browse-${result.id}`}
              result={result}
              addMode={addMode}
              currentSource={source}
              onSelectSource={setSource}
            />
          ) : (
            <SongItem
              key={`ytmusic-${result.id}`}
              song={result}
              query={resultsQuery}
              addMode={addMode}
              currentSource={source}
              onSelectSource={setSource}
            />
          )
        )
      )}
    </List>
  );
}

function LibraryBrowseView({
  title,
  results,
  addMode,
  currentSource,
  onSelectSource,
}: {
  title: string;
  results: BrowseResult[];
  addMode: boolean;
  currentSource: Source;
  onSelectSource: (source: Source) => void;
}) {
  return (
    <Grid
      columns={5}
      aspectRatio="1"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Small}
      navigationTitle={title}
      searchBarPlaceholder={`Filter ${title.toLowerCase()}`}
      filtering={true}
    >
      {results.map((result) => (
        <BrowseGridItem
          key={`library-${result.kind}-${result.id}`}
          result={result}
          addMode={addMode}
          currentSource={currentSource}
          onSelectSource={onSelectSource}
          scopePopDepth={2}
        />
      ))}
    </Grid>
  );
}

function LibrarySongsView({
  title,
  songs,
  addMode,
  currentSource,
  onSelectSource,
  collectionBrowseId,
}: {
  title: string;
  songs: SongResult[];
  addMode: boolean;
  currentSource: Source;
  onSelectSource: (source: Source) => void;
  collectionBrowseId?: string;
}) {
  return (
    <List navigationTitle={title} searchBarPlaceholder={`Filter ${title.toLowerCase()}`} filtering={true}>
      {songs.map((song) => (
        <SongItem
          key={`library-song-${song.id}`}
          song={song}
          query={song.title}
          addMode={addMode}
          currentSource={currentSource}
          onSelectSource={onSelectSource}
          collectionBrowseId={collectionBrowseId}
          scopePopDepth={2}
        />
      ))}
    </List>
  );
}

function ScopeActionSection({
  currentSource,
  onSelect,
  scopePopDepth = 1,
}: {
  currentSource: Source;
  onSelect: (source: Source) => void;
  // Pushed views stack under the picker, so they need an extra pop to land back
  // on the search view where the chosen scope applies.
  scopePopDepth?: number;
}) {
  const { push } = useNavigation();
  return (
    <ActionPanel.Section title="Search in">
      <Action
        title="Search in…"
        icon={Icon.MagnifyingGlass}
        onAction={() =>
          push(<ScopePicker currentSource={currentSource} onSelect={onSelect} popDepth={scopePopDepth} />)
        }
      />
    </ActionPanel.Section>
  );
}

function ScopePicker({
  currentSource,
  onSelect,
  popDepth = 1,
}: {
  currentSource: Source;
  onSelect: (source: Source) => void;
  popDepth?: number;
}) {
  const { pop } = useNavigation();
  return (
    <List navigationTitle="Choose Search Scope">
      {SCOPE_ROWS.map((row) => (
        <List.Item
          key={row.value}
          title={row.title}
          icon={row.icon}
          accessories={currentSource === row.value ? [{ icon: Icon.Check }] : undefined}
          actions={
            <ActionPanel>
              <Action
                title={`Search ${row.title}`}
                icon={row.icon}
                onAction={() => {
                  onSelect(row.value);
                  for (let step = 0; step < popDepth; step += 1) pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function collectionFailureDescription(reason: string): string {
  return LIBRARY_REASON[reason] ?? reason;
}

function CollectionView({
  request,
  addMode,
  currentSource,
  onSelectSource,
}: {
  request: CollectionRequest;
  addMode: boolean;
  currentSource: Source;
  onSelectSource: (source: Source) => void;
}) {
  const [tracks, setTracks] = useState<SongResult[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(undefined);

    void loadCollection(request)
      .catch(() => ({ status: "unavailable" as const, reason: "no-tab" }))
      .then((result: CollectionResult) => {
        if (cancelled) return;
        setIsLoading(false);
        if (result.status === "ready") {
          setTracks(result.tracks);
        } else {
          setTracks([]);
          setError(collectionFailureDescription(result.reason));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [request, attempt]);

  function retry() {
    setAttempt((count) => count + 1);
  }

  return (
    <List
      navigationTitle={request.title}
      searchBarPlaceholder={`Filter ${request.kind === "album" ? "album" : "playlist"} tracks`}
      filtering={true}
      isLoading={isLoading}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load tracks"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={retry} />
            </ActionPanel>
          }
        />
      ) : tracks.length === 0 && !isLoading ? (
        <List.EmptyView title="No tracks found" description={`This ${request.kind} does not contain any tracks.`} />
      ) : (
        tracks.map((song) => (
          <SongItem
            key={`collection-${request.kind}-${request.browseId}-${song.id}`}
            song={song}
            query={song.title}
            addMode={addMode}
            currentSource={currentSource}
            onSelectSource={onSelectSource}
            collectionBrowseId={request.browseId}
            scopePopDepth={2}
          />
        ))
      )}
    </List>
  );
}

function SongItem({
  song,
  query,
  addMode,
  currentSource,
  onSelectSource,
  collectionBrowseId,
  scopePopDepth = 1,
}: {
  song: SongResult;
  query: string;
  addMode: boolean;
  currentSource: Source;
  onSelectSource: (source: Source) => void;
  collectionBrowseId?: string;
  scopePopDepth?: number;
}) {
  const subtitle = [song.artist || "Unknown Artist", song.album].filter(Boolean).join(" · ");

  const play = <Action title="Play Song" icon={Icon.Play} onAction={() => runExclusive(() => playSong(song))} />;
  const addToQueue = (
    <Action
      title="Add to Queue"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["opt"], key: "enter" }}
      onAction={() => runExclusive(() => queueSong(song, query, "end", collectionBrowseId))}
    />
  );

  return (
    <List.Item
      title={song.title}
      subtitle={subtitle}
      icon={song.artworkURL ? artworkURL(song.artworkURL) : Icon.Music}
      accessories={song.duration ? [{ text: song.duration }] : undefined}
      actions={
        <ActionPanel>
          {/* Launched in add mode the panel leads with the queue action, so a
              hotkey can send a track to the queue without an extra keystroke. */}
          {addMode ? addToQueue : play}
          {addMode ? play : addToQueue}
          <Action
            title="Play Next"
            icon={Icon.Forward}
            shortcut={{ modifiers: ["opt", "shift"], key: "enter" }}
            onAction={() => runExclusive(() => queueSong(song, query, "next", collectionBrowseId))}
          />
          <ScopeActionSection currentSource={currentSource} onSelect={onSelectSource} scopePopDepth={scopePopDepth} />
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            icon={Icon.Link}
            content={`https://music.youtube.com/watch?v=${song.id}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function VideoItem({
  video,
  currentSource,
  onSelectSource,
  scopePopDepth = 1,
}: {
  video: VideoResult;
  currentSource: Source;
  onSelectSource: (source: Source) => void;
  scopePopDepth?: number;
}) {
  return (
    <List.Item
      title={video.title}
      subtitle={video.channel || "YouTube"}
      icon={video.artworkURL ? artworkURL(video.artworkURL) : Icon.Video}
      accessories={video.duration ? [{ text: video.duration }] : undefined}
      actions={
        <ActionPanel>
          <Action title="Play Video" icon={Icon.Play} onAction={() => playVideo(video)} />
          <ScopeActionSection currentSource={currentSource} onSelect={onSelectSource} scopePopDepth={scopePopDepth} />
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            icon={Icon.Link}
            content={`https://www.youtube.com/watch?v=${video.id}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function collectionRequest(result: BrowseResult): CollectionRequest {
  if (result.kind !== "album" && result.kind !== "playlist") {
    throw new Error("Only albums and playlists can be browsed as collections.");
  }
  return {
    browseId: result.id,
    title: result.title,
    kind: result.kind,
    artworkURL: result.artworkURL,
  };
}

// Albums and playlists carry a queue id the app can start; artists only have a
// page, so their first action opens it.
function BrowseActions({
  result,
  addMode,
  currentSource,
  onSelectSource,
  scopePopDepth = 1,
}: {
  result: BrowseResult;
  addMode: boolean;
  currentSource: Source;
  onSelectSource: (source: Source) => void;
  scopePopDepth?: number;
}) {
  const { push } = useNavigation();
  const openTitle = result.kind === "album" ? "Open Album" : result.kind === "artist" ? "Open Artist" : "Open Playlist";
  const playTitle = result.kind === "album" ? "Play Album" : "Play Playlist";

  return (
    <ActionPanel>
      {result.playlistId ? (
        <Action title={playTitle} icon={Icon.Play} onAction={() => runExclusive(() => playCollection(result))} />
      ) : null}
      <Action title={openTitle} icon={Icon.AppWindow} onAction={() => runExclusive(() => openBrowse(result))} />
      {result.kind === "album" || result.kind === "playlist" ? (
        <Action
          title="Browse Tracks"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "enter" }}
          onAction={() =>
            push(
              <CollectionView
                request={collectionRequest(result)}
                addMode={addMode}
                currentSource={currentSource}
                onSelectSource={onSelectSource}
              />
            )
          }
        />
      ) : null}
      <ScopeActionSection currentSource={currentSource} onSelect={onSelectSource} scopePopDepth={scopePopDepth} />
      <Action.CopyToClipboard
        title="Copy to Clipboard"
        icon={Icon.Link}
        content={browseLink(result)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    </ActionPanel>
  );
}

function BrowseItem({
  result,
  addMode,
  currentSource,
  onSelectSource,
  scopePopDepth = 1,
}: {
  result: BrowseResult;
  addMode: boolean;
  currentSource: Source;
  onSelectSource: (source: Source) => void;
  scopePopDepth?: number;
}) {
  const icon = result.kind === "album" ? Icon.Cd : result.kind === "artist" ? Icon.Person : Icon.List;

  return (
    <List.Item
      title={result.title}
      subtitle={result.subtitle}
      icon={result.artworkURL ? artworkURL(result.artworkURL) : icon}
      accessories={result.detail ? [{ text: result.detail }] : undefined}
      actions={
        <BrowseActions
          result={result}
          addMode={addMode}
          currentSource={currentSource}
          onSelectSource={onSelectSource}
          scopePopDepth={scopePopDepth}
        />
      }
    />
  );
}

function BrowseGridItem({
  result,
  addMode,
  currentSource,
  onSelectSource,
  scopePopDepth = 1,
}: {
  result: BrowseResult;
  addMode: boolean;
  currentSource: Source;
  onSelectSource: (source: Source) => void;
  scopePopDepth?: number;
}) {
  const fallback = result.kind === "album" ? Icon.Cd : result.kind === "artist" ? Icon.Person : Icon.List;
  const subtitle = [result.subtitle, result.detail].filter(Boolean).join(" · ");

  return (
    <Grid.Item
      content={
        result.artworkURL
          ? { value: browseArtworkURL(result.artworkURL, result.kind), tooltip: result.title }
          : fallback
      }
      title={result.title}
      subtitle={subtitle}
      actions={
        <BrowseActions
          result={result}
          addMode={addMode}
          currentSource={currentSource}
          onSelectSource={onSelectSource}
          scopePopDepth={scopePopDepth}
        />
      }
    />
  );
}

function browseLink(result: BrowseResult): string {
  // Albums and playlists are both addressed by their queue id; only an artist
  // has a browse-only page.
  if (result.playlistId && result.kind !== "artist") {
    return `https://music.youtube.com/playlist?list=${result.playlistId}`;
  }

  return `https://music.youtube.com/browse/${result.id}`;
}

async function playSong(song: SongResult) {
  if (!isVideoId(song.id)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not play",
      message: "YouTube Music returned an invalid video id.",
    });
    return;
  }

  const href = (await runMusic(navigateToVideo(song.id)))?.trim();

  // The helper already showed a toast when the tab or the script failed.
  if (href === undefined) return;

  if (href === "no-app") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not play",
      message: "Open YouTube Music in the selected browser.",
      primaryAction: {
        title: "Open YouTube Music",
        onAction: async () => {
          await openInSelectedBrowser("https://music.youtube.com");
        },
      },
    });
    return;
  }

  // `yt-navigate` resolves before the app updates the URL and starts playback,
  // so poll for the new track instead of reading `location` once.
  const navigated = await pollFor(
    () => runMusic(currentHref),
    (value) => value.includes(`v=${song.id}`),
    NAVIGATION_TIMEOUT_MS,
    200
  );
  if (navigated === undefined) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not play",
      message: "YouTube Music did not switch to that track.",
    });
    return;
  }

  await closeMainWindow();
  await showHUD(`Playing ${song.title}`);
}

/**
 * A YouTube video has no music-app equivalent, so playback is an ordinary watch
 * page open. The browser decides whether that reuses a tab, and nothing here
 * waits on page state: this tab is not the one the music commands control.
 */
async function playVideo(video: VideoResult) {
  if (!isVideoId(video.id)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not play",
      message: "YouTube returned an invalid video id.",
    });
    return;
  }

  const opened = await openInSelectedBrowser(`https://www.youtube.com/watch?v=${video.id}`);
  if (!opened) return;

  await closeMainWindow();
  await showHUD(`Playing ${video.title}`);
}

/**
 * Starts an album or playlist through the queue endpoint its play button uses,
 * then confirms `list=` reached the URL before claiming playback. If the app
 * ignores that endpoint, the page itself is one click from its play button, so
 * it falls back to opening the page rather than reporting a dead end.
 */
async function playCollection(result: BrowseResult) {
  const failureTitle = result.kind === "album" ? "Could not play album" : "Could not play playlist";
  const playlistId = result.playlistId;

  if (!playlistId || !isBrowseId(playlistId)) {
    await showToast({
      style: Toast.Style.Failure,
      title: failureTitle,
      message: "YouTube Music returned no queue for that item.",
    });
    return;
  }

  const dispatched = (await runMusic(playPlaylist(playlistId)))?.trim();
  if (dispatched === undefined) return;

  if (dispatched === "no-app") {
    await showToast({
      style: Toast.Style.Failure,
      title: failureTitle,
      message: "Open YouTube Music in the selected browser.",
    });
    return;
  }

  const playing = await pollFor(
    () => runMusic(currentHref),
    (href) => href.includes(`list=${playlistId}`),
    3000,
    200
  );

  if (playing) {
    await closeMainWindow();
    await showHUD(`Playing ${result.title}`);
    return;
  }

  const opened = (await runMusic(navigateToBrowse(result.id)))?.trim();
  if (opened === undefined) return;

  await closeMainWindow();
  await showHUD(`Opened ${result.title}`);
}

async function openBrowse(result: BrowseResult) {
  if (!isBrowseId(result.id)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open",
      message: "YouTube Music returned an invalid page id.",
    });
    return;
  }

  const dispatched = (await runMusic(navigateToBrowse(result.id)))?.trim();

  // The helper already showed a toast when the tab or the script failed.
  if (dispatched === undefined) return;

  if (dispatched === "no-app") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open",
      message: "Open YouTube Music in the selected browser.",
      primaryAction: {
        title: "Open YouTube Music",
        onAction: async () => {
          await openInSelectedBrowser("https://music.youtube.com");
        },
      },
    });
    return;
  }

  await closeMainWindow();
  await showHUD(`Opened ${result.title}`);
}

async function queueSong(song: SongResult, query: string, position: "end" | "next", collectionBrowseId?: string) {
  const failureTitle = position === "next" ? "Could not play next" : "Could not add to queue";

  if (!isVideoId(song.id)) {
    await showToast({
      style: Toast.Style.Failure,
      title: failureTitle,
      message: "YouTube Music returned an invalid video id.",
    });
    return;
  }

  const progress = await showToast({
    style: Toast.Style.Animated,
    title: position === "next" ? "Playing next" : "Adding to queue",
  });
  const useCollection = collectionBrowseId !== undefined && isBrowseId(collectionBrowseId);
  const opened = await runMusic(useCollection ? navigateToCollection(collectionBrowseId) : navigateToSearch(query));

  if (opened !== "ok") {
    progress.style = Toast.Style.Failure;
    progress.title = failureTitle;
    progress.message =
      opened === "no-app"
        ? "Open YouTube Music in the selected browser."
        : useCollection
        ? "Could not open the YouTube Music collection."
        : "Could not open the YouTube Music search page.";
    return;
  }

  try {
    const row = await pollFor(
      () => runMusic(findResultRow(song.id)),
      (value) => value === "found",
      5000,
      250
    );
    if (!row) throw new Error("That song is not in the YouTube Music search results.");

    const menu = await runMusic(openResultMenu(song.id));
    if (menu !== "clicked") throw new Error("Could not open the song's menu.");

    const ready = await pollFor(
      () => runMusic(menuReady),
      (value) => value === "ready",
      2500,
      200
    );
    if (!ready) throw new Error("The song's menu did not open.");

    const clicked = await runMusic(queueAction(position));
    if (clicked !== "clicked") throw new Error("Could not find the queue action in the menu.");

    // "clicked" is authoritative: the menu was opened for this row and the
    // queue action was found and clicked. Confirming through the app's toast
    // text broke on non-English UIs, and that toast element is persistent, so
    // its text was never reliable confirmation anyway.
    await progress.hide();
    await showHUD(position === "next" ? `Playing ${song.title} next` : `Added ${song.title} to queue`);
  } catch (error) {
    progress.style = Toast.Style.Failure;
    progress.title = failureTitle;
    progress.message = error instanceof Error ? error.message : String(error);
  } finally {
    await runMusic(leaveSearch);
  }
}

async function pollFor(
  check: () => Promise<string | undefined>,
  done: (value: string) => boolean,
  timeoutMs: number,
  intervalMs: number
): Promise<string | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await check();
    if (value === undefined) return undefined;
    if (done(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return undefined;
}

// Artist avatars arrive at 120px; the same lh3/yt3 URL accepts a larger size
// parameter and returns a 544px square, which keeps the grid tiles crisp.
function browseArtworkURL(url: string, kind: BrowseKind): string {
  if (kind === "artist") {
    return url.replace(/=w\d+-h\d+/, "=w544-h544");
  }
  return url;
}

// Search thumbnails can carry a 60px suffix; ask the CDN for a larger source so
// the icon is not an upscale.
function artworkURL(url: string): string {
  return url.replace(/=w\d+-h\d+/, "=w120-h120");
}
