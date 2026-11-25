import React, { useCallback, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlayingUncached } from "./api/getCurrentlyPlaying";
import { findActiveLyricIndex, findLyrics, type LyricsResult, type SyncedLyricLine } from "./api/lyrics";
import { pause } from "./api/pause";
import { play } from "./api/play";
import { seek } from "./api/seek";
import { skipToNext } from "./api/skipToNext";
import { skipToPrevious } from "./api/skipToPrevious";
import { invalidateCache } from "./helpers/apiCache";
import cleanupSongTitle from "./helpers/cleanupSongTitle";
import { formatMs } from "./helpers/formatMs";
import type { TrackObject } from "./helpers/spotify.api";
import { triggerMenuBarRefresh } from "./helpers/triggerMenuBarRefresh";

const TICK_INTERVAL_MS = 200;
const RESYNC_INTERVAL_MS = 5000;
const TRACK_END_SYNC_BUFFER_MS = 500;
const TRACK_END_SYNC_COOLDOWN_MS = 2000;

type SongInfo = {
  trackKey: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  durationMs: number;
};

type PlaybackSyncState = {
  anchorProgressMs: number;
  anchorTimeMs: number;
  isPlaying: boolean;
  durationMs: number;
};

type PlaybackSnapshot = {
  song: SongInfo;
  sync: PlaybackSyncState;
};

function getEstimatedProgressMs(sync: PlaybackSyncState, now = Date.now()): number {
  const raw = sync.isPlaying ? sync.anchorProgressMs + Math.max(0, now - sync.anchorTimeMs) : sync.anchorProgressMs;
  return sync.durationMs > 0 ? Math.min(raw, sync.durationMs) : raw;
}

async function getCurrentPlayback(): Promise<PlaybackSnapshot> {
  await setSpotifyClient();

  const fetchStart = Date.now();
  const currentlyPlayingData = await getCurrentlyPlayingUncached();
  const fetchEnd = Date.now();
  const fetchedAt = Math.round((fetchStart + fetchEnd) / 2);

  if (!currentlyPlayingData) {
    throw new Error("Unable to get playback information from Spotify");
  }

  if (!currentlyPlayingData.item) {
    throw new Error("Nothing is currently playing on Spotify");
  }

  if (currentlyPlayingData.currently_playing_type === "episode") {
    throw new Error("Lyrics are only available for music tracks, not podcasts or episodes");
  }

  const track = currentlyPlayingData.item as TrackObject;
  const title = track.name;
  const artist = track.artists?.[0]?.name;
  const album = track.album?.name ?? "";
  const durationMs = track.duration_ms ?? 0;
  const duration = durationMs ? Math.round(durationMs / 1000) : 0;

  if (!title || !artist || !duration) {
    throw new Error("Could not get song information from the currently playing track");
  }

  const trackKey = track.id || track.uri || `${title}::${artist}::${album}::${duration}`;
  const progressMs = Math.max(0, currentlyPlayingData.progress_ms ?? 0);
  const clampedProgressMs = durationMs > 0 ? Math.min(progressMs, durationMs) : progressMs;

  return {
    song: { trackKey, title, artist, album, duration, durationMs },
    sync: {
      anchorProgressMs: clampedProgressMs,
      anchorTimeMs: fetchedAt,
      isPlaying: Boolean(currentlyPlayingData.is_playing),
      durationMs,
    },
  };
}

async function fetchLyricsWithFallback(song: SongInfo): Promise<LyricsResult> {
  const cleanedTitle = cleanupSongTitle(song.title);
  const primaryResult = await findLyrics({
    title: cleanedTitle,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
  });

  if (primaryResult.lyrics?.trim() || primaryResult.instrumental || cleanedTitle === song.title) {
    return primaryResult;
  }

  return findLyrics({
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
  });
}

export default function FindLyricsCommand() {
  const [lyricsResult, setLyricsResult] = useState<LyricsResult | null>(null);
  const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
  const [playbackSync, setPlaybackSync] = useState<PlaybackSyncState | null>(null);
  const [displayProgressMs, setDisplayProgressMs] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackError, setPlaybackError] = useState<string>("");
  const [lyricsError, setLyricsError] = useState<string>("");
  const [autoFollow, setAutoFollow] = useState(true);
  const [viewMode, setViewMode] = useState<"synced" | "plain">("synced");
  const [searchText, setSearchText] = useState("");

  const mountedRef = useRef(true);
  const syncOwnerRef = useRef(0);
  const inFlightSyncCountRef = useRef(0);
  const inFlightMutationCountRef = useRef(0);
  const pendingRecoverySyncRef = useRef(false);
  const foregroundLoadingCountRef = useRef(0);
  const lyricsHandledTrackKeyRef = useRef<string | null>(null);
  const songInfoRef = useRef<SongInfo | null>(null);
  const playbackSyncRef = useRef<PlaybackSyncState | null>(null);
  const lastTrackEndSyncAtRef = useRef(0);

  const syncPlayback = useCallback(
    async ({
      background = false,
      forceLyricsRefetch = false,
    }: { background?: boolean; forceLyricsRefetch?: boolean } = {}) => {
      if (background && (inFlightSyncCountRef.current > 0 || inFlightMutationCountRef.current > 0)) return;

      pendingRecoverySyncRef.current = false;
      inFlightSyncCountRef.current += 1;
      const mySyncToken = ++syncOwnerRef.current;

      if (!background) {
        foregroundLoadingCountRef.current += 1;
        setIsLoading(true);
      }

      try {
        const snapshot = await getCurrentPlayback();
        if (!mountedRef.current || syncOwnerRef.current !== mySyncToken) return;

        const previousTrackKey = songInfoRef.current?.trackKey;
        const trackChanged = previousTrackKey !== snapshot.song.trackKey;

        setPlaybackError("");
        songInfoRef.current = snapshot.song;
        playbackSyncRef.current = snapshot.sync;
        setSongInfo(snapshot.song);
        setPlaybackSync(snapshot.sync);
        setDisplayProgressMs(getEstimatedProgressMs(snapshot.sync));

        if (trackChanged) {
          lyricsHandledTrackKeyRef.current = null;
          setLyricsResult(null);
          setLyricsError("");
        }

        const needsLyricsFetch =
          forceLyricsRefetch || trackChanged || lyricsHandledTrackKeyRef.current !== snapshot.song.trackKey;

        if (!needsLyricsFetch) {
          return;
        }

        if (forceLyricsRefetch) {
          lyricsHandledTrackKeyRef.current = null;
          setLyricsError("");
        }

        const nextLyrics = await fetchLyricsWithFallback(snapshot.song);
        if (!mountedRef.current || syncOwnerRef.current !== mySyncToken) return;

        if (nextLyrics.lyrics?.trim()) {
          lyricsHandledTrackKeyRef.current = snapshot.song.trackKey;
          setLyricsResult(nextLyrics);
          setLyricsError("");
        } else if (nextLyrics.error) {
          setLyricsResult(null);
          setLyricsError(`Failed to fetch lyrics for "${snapshot.song.title}" by ${snapshot.song.artist}. Retrying...`);
        } else {
          lyricsHandledTrackKeyRef.current = snapshot.song.trackKey;
          setLyricsResult(null);
          setLyricsError(`Oops! Lyrics not available for "${snapshot.song.title}" by ${snapshot.song.artist}`);
        }
      } catch (err: unknown) {
        if (!mountedRef.current || syncOwnerRef.current !== mySyncToken) return;
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch lyrics. Please try again.";
        const hasLoadedTrack = Boolean(songInfoRef.current);
        const isPlaybackStateError =
          errorMessage.includes("Nothing is currently playing") ||
          errorMessage.includes("only available for music tracks");

        if (!background || !hasLoadedTrack || isPlaybackStateError) {
          if (isPlaybackStateError) {
            songInfoRef.current = null;
            playbackSyncRef.current = null;
            lyricsHandledTrackKeyRef.current = null;
            setSongInfo(null);
            setPlaybackSync(null);
            setLyricsResult(null);
            setLyricsError("");
          }
          setPlaybackError(errorMessage);
        } else {
          console.error("Error refreshing playback for lyrics:", err);
        }
      } finally {
        inFlightSyncCountRef.current = Math.max(0, inFlightSyncCountRef.current - 1);
        if (!background) {
          foregroundLoadingCountRef.current = Math.max(0, foregroundLoadingCountRef.current - 1);
          if (mountedRef.current && foregroundLoadingCountRef.current === 0) {
            setIsLoading(false);
          }
        }
        if (
          inFlightSyncCountRef.current === 0 &&
          inFlightMutationCountRef.current === 0 &&
          pendingRecoverySyncRef.current &&
          mountedRef.current
        ) {
          void syncPlayback({ background: true });
        }
      }
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    void syncPlayback({ background: false });

    return () => {
      mountedRef.current = false;
    };
  }, [syncPlayback]);

  const syncedLines = lyricsResult?.syncedLyrics ?? [];

  useEffect(() => {
    if (!playbackSync?.isPlaying) return;

    const interval = setInterval(() => {
      const currentSync = playbackSyncRef.current;
      if (!currentSync || !currentSync.isPlaying) return;

      const now = Date.now();
      const rawMs = currentSync.anchorProgressMs + Math.max(0, now - currentSync.anchorTimeMs);
      const clampedMs = currentSync.durationMs > 0 ? Math.min(rawMs, currentSync.durationMs) : rawMs;

      setDisplayProgressMs((prevMs) => {
        if (syncedLines.length > 0) {
          const prevIndex = findActiveLyricIndex(syncedLines, prevMs);
          const nextIndex = findActiveLyricIndex(syncedLines, clampedMs);
          if (prevIndex !== nextIndex) return clampedMs;
        }

        if (Math.floor(prevMs / 1000) !== Math.floor(clampedMs / 1000)) {
          return clampedMs;
        }

        return prevMs;
      });

      if (
        currentSync.durationMs > 0 &&
        rawMs >= currentSync.durationMs + TRACK_END_SYNC_BUFFER_MS &&
        now - lastTrackEndSyncAtRef.current >= TRACK_END_SYNC_COOLDOWN_MS
      ) {
        lastTrackEndSyncAtRef.current = now;
        void syncPlayback({ background: true });
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [playbackSync?.isPlaying, syncedLines, syncPlayback]);

  useEffect(() => {
    const interval = setInterval(() => {
      void syncPlayback({ background: true });
    }, RESYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [syncPlayback]);

  const releaseMutation = useCallback(() => {
    inFlightMutationCountRef.current = Math.max(0, inFlightMutationCountRef.current - 1);
    if (
      inFlightMutationCountRef.current === 0 &&
      inFlightSyncCountRef.current === 0 &&
      pendingRecoverySyncRef.current &&
      mountedRef.current
    ) {
      void syncPlayback({ background: true });
    }
  }, [syncPlayback]);

  const handleRefresh = async () => {
    invalidateCache("api:currently-playing");
    await syncPlayback({ background: false, forceLyricsRefetch: true });
  };

  const handleTogglePlayback = async () => {
    const currentSync = playbackSyncRef.current;
    const actionTrackKey = songInfoRef.current?.trackKey;
    const currentlyPlaying = currentSync?.isPlaying ?? false;
    const nextPlaying = !currentlyPlaying;
    const actionToken = ++syncOwnerRef.current;
    inFlightMutationCountRef.current += 1;

    try {
      await (nextPlaying ? play() : pause());
      triggerMenuBarRefresh();
      if (!mountedRef.current) return;

      if (songInfoRef.current?.trackKey !== actionTrackKey || syncOwnerRef.current !== actionToken) {
        pendingRecoverySyncRef.current = true;
        return;
      }

      if (currentSync) {
        const now = Date.now();
        const currentProgressMs = getEstimatedProgressMs(currentSync, now);
        const nextSync: PlaybackSyncState = {
          ...currentSync,
          anchorProgressMs: currentProgressMs,
          anchorTimeMs: now,
          isPlaying: nextPlaying,
        };
        playbackSyncRef.current = nextSync;
        setPlaybackSync(nextSync);
        setDisplayProgressMs(currentProgressMs);
      }

      await showToast({ title: nextPlaying ? "Playing" : "Paused" });
    } catch (err) {
      await showFailureToast(err, { title: nextPlaying ? "Failed to play" : "Failed to pause" });
    } finally {
      releaseMutation();
    }
  };

  const handleSkip = async (direction: "next" | "previous") => {
    syncOwnerRef.current += 1;
    inFlightMutationCountRef.current += 1;
    try {
      await (direction === "next" ? skipToNext() : skipToPrevious());
      triggerMenuBarRefresh();
      await syncPlayback({ background: false });
      await showToast({ title: direction === "next" ? "Skipped to next" : "Skipped to previous" });
    } catch (err) {
      await showFailureToast(err, { title: "Failed to skip track" });
    } finally {
      releaseMutation();
    }
  };

  const handleSeekToLine = async (line: SyncedLyricLine) => {
    const actionTrack = songInfo;
    if (!actionTrack) return;
    const actionToken = ++syncOwnerRef.current;
    inFlightMutationCountRef.current += 1;
    try {
      const result = await seek(line.timeMs / 1000, actionTrack.durationMs);
      if (!mountedRef.current) return;

      if (result === "error") {
        await showToast({ style: Toast.Style.Failure, title: "Failed to seek" });
        return;
      }

      if (result === "next") {
        await syncPlayback({ background: false });
        return;
      }

      if (songInfoRef.current?.trackKey !== actionTrack.trackKey || syncOwnerRef.current !== actionToken) {
        pendingRecoverySyncRef.current = true;
        return;
      }

      const now = Date.now();
      const currentSync = playbackSyncRef.current;
      const nextSync: PlaybackSyncState = {
        anchorProgressMs: line.timeMs,
        anchorTimeMs: now,
        isPlaying: currentSync?.isPlaying ?? true,
        durationMs: actionTrack.durationMs,
      };
      playbackSyncRef.current = nextSync;
      setPlaybackSync(nextSync);
      setDisplayProgressMs(line.timeMs);
      setAutoFollow(true);
      await showToast({ title: `Seeked to ${formatMs(line.timeMs)}` });
    } catch (err) {
      await showFailureToast(err, { title: "Failed to seek" });
    } finally {
      releaseMutation();
    }
  };

  const error = playbackError || lyricsError;
  const isPlaying = playbackSync?.isPlaying ?? false;
  const lyricsText = lyricsResult?.lyrics ?? "";
  const navigationTitle = songInfo ? `${songInfo.title} - ${songInfo.artist}` : "Find Lyrics";

  const playbackActions = songInfo ? (
    <ActionPanel.Section title="Playback">
      <Action
        icon={isPlaying ? Icon.Pause : Icon.Play}
        title={isPlaying ? "Pause" : "Play"}
        onAction={handleTogglePlayback}
        shortcut={{ macOS: { modifiers: ["opt"], key: "p" }, Windows: { modifiers: ["alt"], key: "p" } }}
      />
      <Action
        icon={Icon.Forward}
        title="Next"
        onAction={() => handleSkip("next")}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "arrowRight" },
          Windows: { modifiers: ["ctrl"], key: "arrowRight" },
        }}
      />
      <Action
        icon={Icon.Rewind}
        title="Previous"
        onAction={() => handleSkip("previous")}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "arrowLeft" },
          Windows: { modifiers: ["ctrl"], key: "arrowLeft" },
        }}
      />
      <Action
        icon={Icon.ArrowClockwise}
        title="Refresh"
        onAction={handleRefresh}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
    </ActionPanel.Section>
  ) : (
    <ActionPanel.Section>
      <Action
        icon={Icon.ArrowClockwise}
        title="Refresh"
        onAction={handleRefresh}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
    </ActionPanel.Section>
  );

  const shareAndSearchActions = songInfo ? (
    <ActionPanel.Section title="Lyrics">
      {lyricsText && (
        <>
          <Action.CopyToClipboard
            title="Copy Lyrics"
            content={lyricsText}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
          />
          <Action.CopyToClipboard
            title="Copy Song Info"
            content={`${songInfo.title} by ${songInfo.artist}`}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "c" },
              Windows: { modifiers: ["ctrl", "shift"], key: "c" },
            }}
          />
        </>
      )}
      <Action.OpenInBrowser
        title="Search Web for Lyrics"
        url={`https://www.google.com/search?q=${encodeURIComponent(`${songInfo.title} ${songInfo.artist} lyrics`)}`}
        shortcut={{ macOS: { modifiers: ["cmd"], key: "s" }, Windows: { modifiers: ["ctrl"], key: "s" } }}
      />
    </ActionPanel.Section>
  ) : null;

  if (error) {
    const errorMarkdown = `# Error\n\n${error}\n\n## Tips:\n- Try searching for a different version of the song\n- Check if the song is available on LRCLIB\n- Some songs may not have lyrics available`;
    return (
      <Detail
        isLoading={isLoading}
        markdown={errorMarkdown}
        navigationTitle={navigationTitle}
        actions={
          <ActionPanel>
            {playbackActions}
            {shareAndSearchActions}
          </ActionPanel>
        }
      />
    );
  }

  if (!lyricsResult) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={`# Loading lyrics for "${songInfo?.title || "current song"}"\n\nPlease wait while we fetch the lyrics...`}
        navigationTitle={navigationTitle}
        actions={<ActionPanel>{playbackActions}</ActionPanel>}
      />
    );
  }

  if (syncedLines.length > 0 && viewMode === "synced" && songInfo) {
    const activeIndex = findActiveLyricIndex(syncedLines, displayProgressMs);
    const selectedItemId = autoFollow && !searchText ? `line-${activeIndex >= 0 ? activeIndex : 0}` : undefined;
    const sectionSubtitle = `${formatMs(displayProgressMs)} / ${formatMs(songInfo.durationMs)} • ${
      isPlaying ? "Playing" : "Paused"
    }${autoFollow ? "" : " • Auto-follow paused"}`;

    return (
      <List
        isLoading={isLoading}
        filtering={true}
        searchBarPlaceholder="Filter lyrics..."
        onSearchTextChange={setSearchText}
        selectedItemId={selectedItemId}
        navigationTitle={navigationTitle}
      >
        <List.Section title={`${songInfo.title} — ${songInfo.artist}`} subtitle={sectionSubtitle}>
          {syncedLines.map((line, index) => {
            const isActive = index === activeIndex;
            const isPast = activeIndex >= 0 && index < activeIndex;
            const icon = isActive
              ? { source: isPlaying ? Icon.Play : Icon.Pause, tintColor: Color.Green }
              : isPast
                ? { source: Icon.Dot, tintColor: Color.SecondaryText }
                : { source: Icon.Dot };
            const accessories: List.Item.Accessory[] = isActive
              ? [{ tag: { value: isPlaying ? "Now" : "Paused", color: Color.Green } }, { text: formatMs(line.timeMs) }]
              : [{ text: formatMs(line.timeMs) }];

            return (
              <List.Item
                id={`line-${index}`}
                key={`line-${index}`}
                title={line.text || "♪"}
                icon={icon}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Synced Lyrics">
                      <Action
                        icon={Icon.Play}
                        title={`Seek to ${formatMs(line.timeMs)}`}
                        onAction={() => handleSeekToLine(line)}
                      />
                      <Action
                        icon={autoFollow ? Icon.EyeDisabled : Icon.Eye}
                        title={autoFollow ? "Pause Auto-Follow" : "Resume Auto-Follow"}
                        onAction={() => setAutoFollow((prev) => !prev)}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "a" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "a" },
                        }}
                      />
                      <Action
                        icon={Icon.Document}
                        title="View Plain Lyrics"
                        onAction={() => setViewMode("plain")}
                        shortcut={{
                          macOS: { modifiers: ["opt"], key: "m" },
                          Windows: { modifiers: ["alt"], key: "m" },
                        }}
                      />
                    </ActionPanel.Section>
                    {playbackActions}
                    {shareAndSearchActions}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      </List>
    );
  }

  const plainMarkdown = `# ${songInfo?.title}\n\n**Artist:** ${songInfo?.artist}\n\n${
    songInfo?.album ? `**Album:** ${songInfo.album}\n\n` : ""
  }---\n\n${lyricsText
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .join("\n\n")}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={plainMarkdown}
      navigationTitle={navigationTitle}
      actions={
        songInfo ? (
          <ActionPanel>
            {syncedLines.length > 0 && (
              <ActionPanel.Section title="Lyrics View">
                <Action
                  icon={Icon.Music}
                  title="View Synced Lyrics"
                  onAction={() => setViewMode("synced")}
                  shortcut={{
                    macOS: { modifiers: ["opt"], key: "m" },
                    Windows: { modifiers: ["alt"], key: "m" },
                  }}
                />
              </ActionPanel.Section>
            )}
            {playbackActions}
            {shareAndSearchActions}
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
