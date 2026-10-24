import { Action, ActionPanel, Icon, List, Toast, closeMainWindow, showHUD, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  isVideoId,
  searchYouTubeMusic,
  warmYouTubeMusicConnection,
  SONGS_FILTER_PARAMS,
  type SongResult,
} from "./search";
import { openInSelectedBrowser, runJSInYouTubeMusicTab } from "./utils";

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
// roughly a second, so keep the last results per exact query.
const cache = new Map<string, SongResult[]>();

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

// Used to poll after dispatching `yt-navigate`, which resolves before the URL
// and player state update.
export const currentHref = `(function() {
  return location.href;
})();`;

/**
 * YouTube Music pauses after a long idle period and asks "Are you still there?".
 * The prompt renders `ytmusic-you-there-renderer` with one action button;
 * clicking it records the response and resumes playback. Installed once per page
 * load.
 */
export const keepPlaying = `(function() {
  if (window.__ytmKeepPlaying) return "already";
  window.__ytmKeepPlaying = true;
  var pending = false;
  function check() {
    pending = false;
    var dialog = document.querySelector("ytmusic-you-there-renderer");
    if (!dialog || dialog.__ytmDismissed) return;
    var button = dialog.querySelector("button") || dialog.querySelector("yt-button-renderer");
    if (!button) return;
    dialog.__ytmDismissed = true;
    button.click();
  }
  new MutationObserver(function() {
    if (pending) return;
    pending = true;
    setTimeout(check, 0);
  }).observe(document.documentElement, { childList: true, subtree: true });
  return "installed";
})();`;

// The queue is client-side state, so adding to it means using the app's own
// search page and row menu. The page is opened with the same songs filter that
// produced the Play Song results: the app's default search page is a mixed
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

export default function PlaySong() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SongResult[]>([]);
  const [resultsQuery, setResultsQuery] = useState("");
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const query = searchText.trim();

  useEffect(() => {
    warmYouTubeMusicConnection();
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setResultsQuery("");
      setFailure(undefined);
      setIsLoading(false);
      return;
    }

    const cached = cache.get(query);
    if (cached) {
      setResults(cached);
      setResultsQuery(query);
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
        const found = await searchYouTubeMusic(query, controller.signal);
        if (cancelled) return;
        cache.set(query, found);
        if (cache.size > CACHE_LIMIT) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
        setResults(found);
        setResultsQuery(query);
        setFailure(undefined);
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        // The previous query's results must not stay playable under this one.
        setResults([]);
        setResultsQuery(query);
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
  }, [query]);

  // While refining a query that still starts with the previous one, keep the
  // previous results on screen instead of blanking the list for a second.
  const isRefinement = resultsQuery !== "" && query.startsWith(resultsQuery);
  const visible = isRefinement || !isLoading ? results : [];
  const searchFailed = failure !== undefined && resultsQuery === query;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search YouTube Music" onSearchTextChange={setSearchText}>
      {!query ? (
        <List.EmptyView
          title="Search YouTube Music"
          description="Type a song, artist, or album to play it in the selected browser."
        />
      ) : visible.length === 0 && isLoading ? (
        <List.EmptyView title="Searching..." description={`Looking for "${query}".`} />
      ) : visible.length === 0 && searchFailed ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Search failed" description={failure} />
      ) : visible.length === 0 ? (
        <List.EmptyView title="No results found" description="Try a different search term." />
      ) : (
        // The visible rows belong to `resultsQuery`, which can trail the typed
        // query while a refinement is in flight.
        visible.map((song) => <SongItem key={song.id} song={song} query={resultsQuery} />)
      )}
    </List>
  );
}

function SongItem({ song, query }: { song: SongResult; query: string }) {
  const subtitle = [song.artist || "Unknown Artist", song.album].filter(Boolean).join(" · ");

  return (
    <List.Item
      title={song.title}
      subtitle={subtitle}
      icon={song.artworkURL ? artworkURL(song.artworkURL) : Icon.Music}
      accessories={song.duration ? [{ text: song.duration }] : undefined}
      actions={
        <ActionPanel>
          <Action title="Play Song" icon={Icon.Play} onAction={() => runExclusive(() => playSong(song))} />
          <Action
            title="Play Next"
            icon={Icon.Forward}
            shortcut={{ modifiers: ["opt", "shift"], key: "enter" }}
            onAction={() => runExclusive(() => queueSong(song, query, "next"))}
          />
          <Action
            title="Add to Queue"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["opt"], key: "enter" }}
            onAction={() => runExclusive(() => queueSong(song, query, "end"))}
          />
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
        onAction: () => openInSelectedBrowser("https://music.youtube.com"),
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

  await runMusic(keepPlaying);
  await closeMainWindow();
  await showHUD(`Playing ${song.title}`);
}

async function queueSong(song: SongResult, query: string, position: "end" | "next") {
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
  const opened = await runMusic(navigateToSearch(query));

  if (opened !== "ok") {
    progress.style = Toast.Style.Failure;
    progress.title = failureTitle;
    progress.message =
      opened === "no-app"
        ? "Open YouTube Music in the selected browser."
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

// Search thumbnails can carry a 60px suffix; ask the CDN for a larger source so
// the icon is not an upscale.
function artworkURL(url: string): string {
  return url.replace(/=w\d+-h\d+/, "=w120-h120");
}
