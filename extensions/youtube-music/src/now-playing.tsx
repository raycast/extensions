import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  LaunchType,
  List,
  Toast,
  getPreferenceValues,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchQueueArtwork } from "./search";
import { openInSelectedBrowser, runJSInYouTubeMusicTab, type TabError } from "./utils";

function runMusic(code: string, options?: { silent?: boolean; onError?: (reason: TabError) => void }) {
  return runJSInYouTubeMusicTab(code, { ...options, musicOnly: true });
}

const POLL_MS = 1000;
const ARTWORK_SIZE = 240;
const DEFAULT_HISTORY_LIMIT = 5;
const MAX_HISTORY_LIMIT = 50;
const UP_NEXT_LIMIT = 50;
const NOW_PLAYING_ID = "ytm-now-playing";

interface QueueTrack {
  title: string;
  artist: string;
  duration?: string;
  videoId: string;
  index: number;
  artworkURL?: string;
}

interface Preferences {
  browser: { name: string };
  historyLimit?: string;
}

// The preference is a dropdown, so the value arrives as a string. Clamp it
// rather than trusting the stored value.
function historyLimit(): number {
  const value = Number(getPreferenceValues<Preferences>().historyLimit);
  if (!Number.isFinite(value)) return DEFAULT_HISTORY_LIMIT;
  return Math.min(MAX_HISTORY_LIMIT, Math.max(0, Math.floor(value)));
}

interface PlayerState {
  title: string;
  artist: string;
  album?: string;
  year?: string;
  artworkURL?: string;
  position: number;
  duration: number;
  playing: boolean;
  like: "LIKE" | "DISLIKE" | "INDIFFERENT";
  videoId: string;
  playlistId?: string;
  selectedIndex: number;
  queue: QueueTrack[];
}

// Queue rows are addressed by video id rather than by position: the queue
// re-indexes when a track is removed, and a snapshot can be a poll interval old.
// The row carries the id either as an attribute or on a `v=` link. Matching a
// row's title as well means a stale entry cannot start the wrong song.
const queueRowHelpers = `
  function rowVideoId(item) {
    var direct = item.getAttribute("video-id") || item.getAttribute("data-video-id") || "";
    if (/^[A-Za-z0-9_-]{11}$/.test(direct)) return direct;
    var link = item.querySelector('a[href*="v="]');
    var href = link ? link.getAttribute("href") || "" : "";
    var match = href.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    return match ? match[1] : "";
  }
  function rowTitle(item) {
    var title = item.querySelector(".song-title");
    return (title ? title.textContent : "").replace(/\\s+/g, " ").trim();
  }
  function findQueueRow(videoId, title) {
    var wanted = (title || "").replace(/\\s+/g, " ").trim();
    var items = document.querySelectorAll("ytmusic-player-queue-item");
    var titleMatch = null;
    var titleMatches = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var id = rowVideoId(item);
      if (id && videoId) {
        if (id === videoId) {
          return { item: item, status: rowTitle(item) === wanted ? "ok" : "mismatch" };
        }
        continue;
      }
      if (wanted && rowTitle(item) === wanted) {
        titleMatch = item;
        titleMatches++;
      }
    }
    // Without an id, a title is only safe when exactly one row carries it.
    if (titleMatches === 1) return { item: titleMatch, status: "ok" };
    if (titleMatches > 1) return { item: null, status: "ambiguous" };
    return { item: null, status: "no-match" };
  }
`;

// The queue is the only place the web app exposes history: items before the
// selected one have already played, and items after it are up next.
const readState = `(function() {
  ${queueRowHelpers}
  var bar = document.querySelector("ytmusic-player-bar");
  if (!bar) return "no-bar";
  var titleEl = bar.querySelector(".title");
  var bylineEl = bar.querySelector(".byline");
  var timeEl = bar.querySelector(".time-info");
  var image = bar.querySelector("img.image");
  var video = document.querySelector("video");
  var likeEl = document.querySelector("ytmusic-like-button-renderer");
  function seconds(text) {
    if (!text) return 0;
    var parts = text.split(":").map(Number);
    return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  }
  var time = (timeEl ? timeEl.textContent : "").split("/");
  var items = document.querySelectorAll("ytmusic-player-queue-item");
  var queue = [];
  var selected = -1;
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var itemTitle = item.querySelector(".song-title");
    var itemByline = item.querySelector(".byline");
    var itemDuration = item.querySelector(".duration");
    var itemImage = item.querySelector("img");
    if (item.hasAttribute("selected")) selected = i;
    queue.push({
      title: itemTitle ? itemTitle.textContent : "",
      artist: itemByline ? itemByline.textContent : "",
      duration: itemDuration ? itemDuration.textContent : "",
      videoId: rowVideoId(item),
      index: i,
      artworkURL: itemImage ? itemImage.src : ""
    });
  }
  var byline = (bylineEl ? bylineEl.textContent : "")
    .split(" • ")
    .map(function(part) {
      return part.trim();
    })
    .filter(function(part) {
      // Tracks without album data put view and like counts where the album and
      // year normally sit.
      return (
        part.length > 0 &&
        !/^[\\d.,]+\\s*[KMB]?\\s+(views?|likes?|plays?|subscribers?)$/i.test(part) &&
        !/^sponsored$/i.test(part)
      );
    });
  var lastBylinePart = byline[byline.length - 1] || "";
  var year = byline.length > 2 && /^(19|20)\\d{2}$/.test(lastBylinePart) ? lastBylinePart : "";
  var album = byline.length > 1 && byline[1] !== year ? byline[1] : "";
  var duration = video && isFinite(video.duration) && video.duration > 0 ? video.duration : seconds(time[1]);
  return JSON.stringify({
    title: titleEl ? titleEl.textContent : "",
    artist: byline[0] || "",
    album: album,
    year: year,
    artworkURL: image ? image.src : "",
    position: video ? video.currentTime : seconds(time[0]),
    duration: duration,
    playing: video ? !video.paused : false,
    like: likeEl ? likeEl.getAttribute("like-status") : "INDIFFERENT",
    videoId: (location.search.match(/[?&]v=([A-Za-z0-9_-]{11})/) || [])[1] || "",
    playlistId: (location.search.match(/[?&]list=([^&]+)/) || [])[1] || "",
    selectedIndex: selected,
    queue: queue
  });
})();`;

const togglePlayback = `(function() {
  var button = document.querySelector("#play-pause-button button");
  if (!button) return "no-button";
  button.click();
  return "ok";
})();`;

const nextTrack = `(function() {
  var button = document.querySelector(".next-button button");
  if (!button) return "no-button";
  button.click();
  return "ok";
})();`;

const previousTrack = `(function() {
  var button = document.querySelector(".previous-button button");
  if (!button) return "no-button";
  button.click();
  return "ok";
})();`;

const likeTrack = `(function() {
  var button = document.querySelector("#button-shape-like button");
  if (!button) return "no-button";
  button.click();
  return "ok";
})();`;

const dislikeTrack = `(function() {
  var button = document.querySelector("#button-shape-dislike button");
  if (!button) return "no-button";
  button.click();
  return "ok";
})();`;

function playQueueItem(track: QueueTrack): string {
  return `(function() {
  ${queueRowHelpers}
  var found = findQueueRow(${JSON.stringify(track.videoId)}, ${JSON.stringify(track.title)});
  if (found.status !== "ok") return found.status;
  var button = found.item.querySelector("ytmusic-play-button-renderer");
  if (!button) return "no-button";
  button.click();
  return "ok";
})();`;
}

function openQueueMenu(track: QueueTrack): string {
  return `(function() {
  ${queueRowHelpers}
  var found = findQueueRow(${JSON.stringify(track.videoId)}, ${JSON.stringify(track.title)});
  if (found.status !== "ok") return found.status;
  var button = found.item.querySelector("ytmusic-menu-renderer button");
  if (!button) return "no-button";
  button.click();
  return "clicked";
})();`;
}

// Queue rows share the search-row menu; removal has no stable icon of its own,
// so it is the one action matched by label and therefore needs an English menu.
const removeFromQueue = `(function() {
  var items = document.querySelectorAll("ytmusic-menu-popup-renderer ytmusic-menu-service-item-renderer");
  for (var i = 0; i < items.length; i++) {
    var label = (items[i].textContent || "").trim().toLowerCase();
    if (label.indexOf("remove from queue") >= 0) {
      var target = items[i].querySelector("yt-formatted-string") || items[i];
      target.click();
      return "clicked";
    }
  }
  return "no-match";
})();`;

const queueMenuReady = `(function() {
  var items = document.querySelectorAll("ytmusic-menu-popup-renderer ytmusic-menu-service-item-renderer");
  return items.length ? "ready" : "pending";
})();`;

const closePopup = `(function() {
  var close = document.querySelector("ytmusic-menu-popup-renderer #hidden-close-button");
  if (close) close.click();
  return "ok";
})();`;

export default function NowPlaying() {
  const [state, setState] = useState<PlayerState | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [reason, setReason] = useState<TabError | "no-bar" | null>(null);
  const [pinned, setPinned] = useState(true);
  const [tick, setTick] = useState(0);
  const [queueArt, setQueueArt] = useState<Record<string, string>>({});
  const refresh = useCallback(() => setTick((value) => value + 1), []);
  const lastRaw = useRef<string | undefined>(undefined);
  const artSignature = useRef("");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const loadQueueArtwork = (snapshot: PlayerState) => {
      const signature = [snapshot.videoId, snapshot.playlistId ?? "", ...snapshot.queue.map((t) => t.videoId)].join(
        "|"
      );
      if (signature === artSignature.current) return;
      artSignature.current = signature;

      // One request per queue change; rows keep their fallback art meanwhile.
      void fetchQueueArtwork(snapshot.videoId, snapshot.playlistId)
        .then((art) => {
          if (!cancelled && art.size > 0) setQueueArt(Object.fromEntries(art));
        })
        .catch(() => undefined);
    };

    const poll = async () => {
      // Silent polling must still distinguish "no tab" from "JavaScript from
      // Apple Events is off", otherwise the empty view sends first-run users to
      // open a tab they already have.
      let tabError: TabError | undefined;
      try {
        const raw = await runMusic(readState, {
          silent: true,
          onError: (error) => {
            tabError = error;
          },
        });
        if (cancelled) return;

        // The page is polled every second, so only hand a new object to React
        // when the snapshot actually changed. Otherwise a paused player keeps
        // re-rendering for no reason.
        if (raw && raw.startsWith("{")) {
          setReason(null);
          if (raw !== lastRaw.current) {
            lastRaw.current = raw;
            try {
              const next = JSON.parse(raw) as PlayerState;
              // The bar is briefly titleless during a track change; keep the
              // last good snapshot instead of rendering an empty title.
              if (next.title.trim()) {
                setState(next);
                loadQueueArtwork(next);
              }
            } catch {
              // Keep the last good state.
            }
          }
        } else {
          setReason(tabError ?? (raw === "no-bar" ? "no-bar" : "no-tab"));
          if (lastRaw.current !== undefined) {
            lastRaw.current = undefined;
            setState(undefined);
          }
        }
      } catch {
        // A transient failure must not stop the loop.
      } finally {
        if (!cancelled) {
          setLoaded(true);
          timer = setTimeout(poll, POLL_MS);
        }
      }
    };

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tick]);

  if (!state) {
    const browser = getPreferenceValues<Preferences>().browser;
    const browserName = browser?.name ?? "the selected browser";
    const unavailable = unavailableCopy(reason, browserName);
    // The browser is running but has no music tab, or is not running at all:
    // both are fixed by opening YouTube Music in the selected browser.
    const canOpen = reason === "no-tab" || reason === "browser-unavailable";

    return (
      <List isLoading={!loaded}>
        <List.EmptyView
          icon={Icon.Music}
          title={!loaded ? "Connecting to YouTube Music" : unavailable.title}
          description={!loaded ? "Reading the player state." : unavailable.description}
          actions={
            <ActionPanel>
              {canOpen ? (
                <Action
                  title="Open YouTube Music"
                  icon={Icon.Globe}
                  onAction={() => openInSelectedBrowser("https://music.youtube.com")}
                />
              ) : null}
              <Action
                title="Play Song…"
                icon={Icon.MagnifyingGlass}
                onAction={() => launchCommand({ name: "play-song", type: LaunchType.UserInitiated })}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const { queue, selectedIndex } = state;
  // The row the app marks `selected` can be missing during a track change and
  // can disagree with the player bar, so locate the playing track by video id
  // first and only fall back to the marked row.
  const playingIndex = state.videoId !== "" ? queue.findIndex((track) => track.videoId === state.videoId) : -1;
  const currentIndex = playingIndex >= 0 ? playingIndex : selectedIndex;
  const isPlaying = (track: QueueTrack) =>
    track.index === currentIndex || (playingIndex < 0 && state.videoId !== "" && track.videoId === state.videoId);

  const historyCount = historyLimit();
  const history =
    currentIndex > 0 && historyCount > 0
      ? queue
          .slice(Math.max(0, currentIndex - historyCount), currentIndex)
          .reverse()
          .filter((track) => !isPlaying(track))
      : [];
  // An unmarked queue position is unknown, not "everything is up next".
  const upNext =
    currentIndex >= 0
      ? queue
          .slice(currentIndex + 1)
          .filter((track) => !isPlaying(track))
          .slice(0, UP_NEXT_LIMIT)
      : [];

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Filter queue..."
      selectedItemId={pinned ? NOW_PLAYING_ID : undefined}
      onSelectionChange={() => setPinned(false)}
    >
      {history.length > 0 ? (
        <List.Section title="Recently Played">
          {history.map((track) => (
            <QueueItem
              key={`recent-${track.videoId || track.index}`}
              track={track}
              artwork={queueArt}
              onRefresh={refresh}
            />
          ))}
        </List.Section>
      ) : null}

      <List.Section title="Now Playing">
        <List.Item
          id={NOW_PLAYING_ID}
          title={state.title}
          subtitle={state.artist}
          icon={hasArtwork(state.artworkURL) ? artworkURL(state.artworkURL, 120) : Icon.Music}
          accessories={state.duration > 0 ? [{ text: formatTime(state.duration) }] : undefined}
          detail={<TrackDetail state={state} />}
          actions={<CurrentTrackActions state={state} onRefresh={refresh} />}
        />
      </List.Section>

      {upNext.length > 0 ? (
        <List.Section title="Up Next">
          {upNext.map((track) => (
            <QueueItem
              key={`next-${track.videoId || track.index}`}
              track={track}
              artwork={queueArt}
              onRefresh={refresh}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

// Silent polling reports why the player could not be read. Name the actual cause
// instead of assuming the tab is missing.
function unavailableCopy(
  reason: TabError | "no-bar" | null,
  browserName: string
): { title: string; description: string } {
  switch (reason) {
    case "js-events-disabled":
      return {
        title: "Enable JavaScript from Apple Events",
        description: `Open ${browserName}'s Develop menu and enable "Allow JavaScript from Apple Events".`,
      };
    case "automation":
      return {
        title: "Automation Permission Needed",
        description: `macOS blocked Raycast from controlling ${browserName}. Allow it in System Settings → Privacy & Security → Automation.`,
      };
    case "browser-unavailable":
      return {
        title: `${browserName} Is Not Running`,
        description: `Open ${browserName} and a YouTube Music tab, or change the browser in the extension preferences.`,
      };
    case "applescript-error":
      return {
        title: "Could Not Read YouTube Music",
        description: `The AppleScript request to ${browserName} failed. Reload the YouTube Music tab and try again.`,
      };
    case "js-error":
      return {
        title: "YouTube Music Returned an Error",
        description: "Reload the YouTube Music tab and try again.",
      };
    case "no-bar":
      return {
        title: "Nothing Is Playing",
        description: "Start a track in YouTube Music.",
      };
    default:
      return {
        title: "No YouTube Music Tab",
        description: `Open YouTube Music in ${browserName}, or change the browser in the extension preferences.`,
      };
  }
}

// Every injected helper reports a sentinel string, and `undefined` means the
// runner already showed its own toast. Only "ok"/"clicked" mean the action ran.
async function reportResult(result: string | undefined, failure: string): Promise<void> {
  if (result === "ok" || result === "clicked" || result === undefined) return;
  await showToast({ style: Toast.Style.Failure, title: failure });
}

function QueueItem({
  track,
  artwork,
  onRefresh,
}: {
  track: QueueTrack;
  artwork: Record<string, string>;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      title={track.title}
      subtitle={track.artist}
      icon={queueIcon(track, artwork)}
      accessories={track.duration ? [{ text: track.duration }] : undefined}
      detail={<QueueDetail track={track} />}
      actions={
        <ActionPanel>
          <Action
            title="Play"
            icon={Icon.Play}
            onAction={async () => {
              await reportResult(await runMusic(playQueueItem(track)), "Could not play that track");
              onRefresh();
            }}
          />
          <Action
            title="Remove from Queue"
            icon={Icon.XMarkCircle}
            onAction={async () => {
              await removeQueueItem(track);
              onRefresh();
            }}
          />
          <Action.CopyToClipboard title="Copy Title" icon={Icon.Link} content={track.title} />
          <ActionPanel.Section title="Search">
            <Action
              title="Play Song…"
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() => launchCommand({ name: "play-song", type: LaunchType.UserInitiated })}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function CurrentTrackActions({ state, onRefresh }: { state: PlayerState; onRefresh: () => void }) {
  const isLiked = state.like === "LIKE";
  const isDisliked = state.like === "DISLIKE";

  return (
    <ActionPanel>
      <ActionPanel.Section title="Playback">
        <Action
          title={state.playing ? "Pause" : "Play"}
          icon={state.playing ? Icon.Pause : Icon.Play}
          onAction={async () => {
            await reportResult(await runMusic(togglePlayback), state.playing ? "Could not pause" : "Could not play");
            onRefresh();
          }}
        />
        <Action
          title="Next Track"
          icon={Icon.Forward}
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          onAction={async () => {
            await reportResult(await runMusic(nextTrack), "Could not go to the next track");
            onRefresh();
          }}
        />
        <Action
          title="Previous Track"
          icon={Icon.Rewind}
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          onAction={async () => {
            await reportResult(await runMusic(previousTrack), "Could not go to the previous track");
            onRefresh();
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Rating">
        <Action
          title={isLiked ? "Unlike" : "Like"}
          icon={isLiked ? Icon.HeartDisabled : Icon.Heart}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={async () => {
            await reportResult(
              await runMusic(likeTrack),
              isLiked ? "Could not unlike the track" : "Could not like the track"
            );
            onRefresh();
          }}
        />
        <Action
          title={isDisliked ? "Remove Dislike" : "Dislike"}
          icon={Icon.HeartDisabled}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={async () => {
            await reportResult(
              await runMusic(dislikeTrack),
              isDisliked ? "Could not remove the dislike" : "Could not dislike the track"
            );
            onRefresh();
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Queue">
        <Action
          title="Play Song…"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => launchCommand({ name: "play-song", type: LaunchType.UserInitiated })}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
      {state.videoId ? (
        <Action.CopyToClipboard
          title="Copy Link"
          icon={Icon.Link}
          content={`https://music.youtube.com/watch?v=${state.videoId}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      ) : null}
    </ActionPanel>
  );
}

// `List.Item.Detail` renders markdown above the metadata block, and the block
// cannot be resized, so only the artwork goes in markdown. Text lives in
// metadata rows, otherwise the pane starts scrolling.
function TrackDetail({ state }: { state: PlayerState }) {
  const progress = state.duration > 0 ? state.position / state.duration : 0;

  return (
    <List.Item.Detail
      markdown={hasArtwork(state.artworkURL) ? `![Artwork](${artworkURL(state.artworkURL, ARTWORK_SIZE)})` : ""}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Track" text={state.title} />
          <Detail.Metadata.Label title="Artist" text={state.artist || "Unknown"} />
          {state.album ? <Detail.Metadata.Label title="Album" text={state.album} /> : null}
          {state.duration > 0 ? (
            <Detail.Metadata.Label
              title={state.playing ? "Playing" : "Paused"}
              text={`${formatTime(state.position)} / ${formatTime(state.duration)}`}
              icon={getProgressIcon(progress, Color.PrimaryText)}
            />
          ) : null}
          {state.year ? <Detail.Metadata.Label title="Year" text={state.year} /> : null}
        </Detail.Metadata>
      }
    />
  );
}

function QueueDetail({ track }: { track: QueueTrack }) {
  return (
    <List.Item.Detail
      markdown=""
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Track" text={track.title} />
          <Detail.Metadata.Label title="Artist" text={track.artist || "Unknown"} />
          {track.duration ? <Detail.Metadata.Label title="Duration" text={track.duration} /> : null}
        </Detail.Metadata>
      }
    />
  );
}

async function removeQueueItem(track: QueueTrack) {
  const opened = await runMusic(openQueueMenu(track));
  if (opened !== "clicked") {
    await reportResult(opened, "Could not open the queue menu");
    return;
  }

  const deadline = Date.now() + 2000;
  let ready = false;
  while (Date.now() < deadline) {
    if ((await runMusic(queueMenuReady)) === "ready") {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (ready) {
    const removed = await runMusic(removeFromQueue);
    if (removed === "no-match") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove that track",
        message: "YouTube Music's menu language has to be English for this action.",
      });
    } else {
      await reportResult(removed, "Could not remove that track");
    }
  } else {
    await showToast({ style: Toast.Style.Failure, title: "Could not open the queue menu" });
  }
  await runMusic(closePopup);
}

// The app assigns a 1x1 data URI to rows it has not rendered yet; treat that as
// no artwork rather than trying to display it.
function hasArtwork(url?: string): url is string {
  return Boolean(url && url.startsWith("http"));
}

// Only real artwork is shown. Rows render without an icon until the queue
// payload or the row's own image supplies square art, rather than repeating a
// placeholder down the list.
function queueIcon(track: QueueTrack, artwork: Record<string, string>): string | undefined {
  const apiArtwork = artwork[track.videoId];
  if (apiArtwork) return artworkURL(apiArtwork, 60);
  if (hasArtwork(track.artworkURL)) return artworkURL(track.artworkURL, 60);
  return undefined;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const total = Math.floor(seconds);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

// The player bar hands back a 60px thumbnail; ask the CDN for a larger source
// so the artwork is crisp, then let Raycast scale it down.
function artworkURL(url: string, size: number): string {
  const source = url.replace(/=w\d+-h\d+/, `=w${size * 2}-h${size * 2}`);
  return `${source}?raycast-width=${size}&raycast-height=${size}`;
}
