import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  LaunchType,
  List,
  launchCommand,
} from "@raycast/api";
import { getProgressIcon, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { resolveAlbum } from "./utils/album";
import {
  cycleRepeat,
  dislikeTrack,
  formatTime,
  getKasetState,
  getPlayQueue,
  getRecent,
  isKasetRunning,
  likeTrack,
  nextTrack,
  playPause,
  playTrackAtIndex,
  playVideo,
  previousTrack,
  recordFinishedTrack,
  removeFromQueue,
  toggleMute,
  toggleShuffle,
  type KasetState,
  type PlayQueue,
  type RecentTrack,
  type Track,
} from "./utils/kaset";
import { readSnapshot, SNAPSHOT_KEYS, writeSnapshot } from "./utils/snapshot";

interface LibraryData {
  running: boolean;
  queue: PlayQueue | null;
  recent: RecentTrack[];
}

const ARTWORK_SIZE = 200;
const NOW_PLAYING_ID = "kaset-now-playing-row";

export default function NowPlaying() {
  // Read the previous snapshot once, synchronously, so the first render has
  // content to show before any async work finishes.
  const [cachedLibrary] = useState(() =>
    readSnapshot<LibraryData>(SNAPSHOT_KEYS.library),
  );
  const [cachedState] = useState(() =>
    readSnapshot<KasetState>(SNAPSHOT_KEYS.state),
  );

  // Library data refreshes on actions; player state polls so progress is live.
  const { data: liveLibrary, revalidate: refreshLibrary } = usePromise(
    async (): Promise<LibraryData> => {
      const [running, queue, recent] = await Promise.all([
        isKasetRunning(),
        getPlayQueue(),
        getRecent(),
      ]);
      return { running, queue, recent };
    },
  );

  const { data: liveState, revalidate: refreshState } =
    usePromise(getKasetState);

  const library = liveLibrary ?? cachedLibrary;
  const state = liveState ?? cachedState;

  useEffect(() => {
    const id = setInterval(() => {
      void refreshState();
    }, 1000);
    return () => clearInterval(id);
  }, [refreshState]);

  // Persist only when something meaningful changes; writing on every poll tick
  // would hit the disk once a second for no benefit.
  useEffect(() => {
    if (liveLibrary) writeSnapshot(SNAPSHOT_KEYS.library, liveLibrary);
  }, [liveLibrary]);

  useEffect(() => {
    if (liveState) writeSnapshot(SNAPSHOT_KEYS.state, liveState);
  }, [liveState?.currentTrack?.id, liveState?.playerState]);

  const currentTrack = state?.currentTrack?.id ? state.currentTrack : null;
  // Resolved once per track id, not per poll tick (see useResolvedAlbum).
  const currentAlbum = useResolvedAlbum(currentTrack);

  // Pin the first selection to Now Playing so it is on screen at load even
  // though Recently Played sits above it; released once the user moves.
  const [pinSelection, setPinSelection] = useState(true);

  useEffect(() => {
    void recordFinishedTrack(currentTrack).then(() => refreshLibrary());
  }, [currentTrack?.id]);

  // Only the first load shows the loading shell; polling must not re-trigger it.
  if (library === undefined || state === undefined) {
    return <List isLoading searchBarPlaceholder="Loading player..." />;
  }

  if (!library.running) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Music}
          title="Kaset is not running"
          description="Launch Kaset to control playback."
          actions={
            <ActionPanel>
              <Action.Open title="Launch Kaset" target="kaset://" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!state) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Player not ready"
          description="Kaset is open but its player is not initialised. Start a track, then retry."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refreshLibrary}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const tracks = library.queue?.tracks ?? [];
  const currentIndex = library.queue?.currentIndex ?? 0;
  const upNext = currentIndex > 0 ? tracks.slice(currentIndex) : tracks;
  // History is stored newest-first, but the section sits above Now Playing, so
  // show it oldest-first: the most recent track then lands directly above the
  // current one and the list reads as a single timeline.
  const recent = (library.recent ?? []).slice().reverse();

  if (!currentTrack && upNext.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Music}
          title="Nothing is playing"
          description="Start playback in Kaset or search for a song."
          actions={
            <ActionPanel>
              <Action
                title="Play Song…"
                icon={Icon.MagnifyingGlass}
                onAction={() =>
                  launchCommand({
                    name: "play-song",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refreshLibrary}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Filter queue..."
      selectedItemId={pinSelection && currentTrack ? NOW_PLAYING_ID : undefined}
      onSelectionChange={() => setPinSelection(false)}
    >
      {recent.length > 0 ? (
        <List.Section title="Recently Played">
          {recent.map((track) => (
            <List.Item
              key={`recent-${track.id}`}
              icon={track.artworkURL || Icon.Music}
              title={track.name}
              subtitle={[track.artist, track.album].filter(Boolean).join(" • ")}
              detail={<TrackDetail track={track} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Play Again"
                    icon={Icon.Play}
                    onAction={() => playVideo(track.id)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Link"
                    icon={Icon.Link}
                    content={`https://youtu.be/${track.id}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {currentTrack ? (
        <List.Section title="Now Playing">
          <PlayerQueueItem
            itemId={NOW_PLAYING_ID}
            track={currentTrack}
            index={currentIndex}
            isCurrent
            album={currentAlbum}
            state={state}
            onRevalidate={refreshLibrary}
          />
        </List.Section>
      ) : null}

      {upNext.length > 0 ? (
        <List.Section title="Up Next">
          {upNext.map((track, offset) => (
            <PlayerQueueItem
              key={`${track.id}-${offset}`}
              track={track}
              index={currentIndex + offset + 1}
              onRevalidate={refreshLibrary}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function PlayerQueueItem({
  track,
  index,
  itemId,
  isCurrent = false,
  album,
  state,
  onRevalidate,
}: {
  track: Track;
  index: number;
  itemId?: string;
  isCurrent?: boolean;
  album?: string;
  state?: KasetState;
  onRevalidate: () => void;
}) {
  return (
    <List.Item
      id={itemId}
      icon={track.artworkURL || Icon.Music}
      title={track.name}
      subtitle={[track.artist, track.album || album]
        .filter(Boolean)
        .join(" • ")}
      detail={
        isCurrent && state ? (
          <TrackDetail track={track} state={state} album={album} />
        ) : (
          <TrackDetail track={track} album={album} />
        )
      }
      actions={
        isCurrent && state ? (
          <CurrentTrackActions
            track={track}
            state={state}
            onRevalidate={onRevalidate}
          />
        ) : (
          <QueueRowActions
            track={track}
            index={index}
            onRevalidate={onRevalidate}
          />
        )
      }
    />
  );
}

// Resolve the album once when the track id changes, not on every progress poll.
// `resolveAlbum` caches by video id, so returning to a track is instant.
function useResolvedAlbum(track: Track | null): string | undefined {
  const id = track?.id;
  const [resolved, setResolved] = useState<string | undefined>(undefined);

  useEffect(() => {
    setResolved(undefined);
    if (!id || !track || track.album || !track.name) return;

    let cancelled = false;
    void resolveAlbum(id, track.name, track.artist).then((album) => {
      if (!cancelled) setResolved(album);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return track ? track.album || resolved : undefined;
}

// `List.Item.Detail` renders `markdown` first and then `metadata` underneath
// it, so the markdown region is the flexible part. Title and artist go at the
// top where they stay visible; the artwork sits below and absorbs the leftover
// space.
// `List.Item.Detail` renders `markdown` first and then `metadata` underneath it.
// Only the artwork goes in the markdown: headline text there adds height to the
// pane, and the metadata block cannot be resized, so the title and artist live
// in metadata rows instead.
function TrackDetail({
  track,
  state,
  album,
}: {
  track: Track;
  state?: KasetState;
  album?: string;
}) {
  const markdown = track.artworkURL
    ? `![Artwork](${artworkURL(track.artworkURL, ARTWORK_SIZE)})`
    : "";

  const progress =
    state && state.duration > 0 ? state.position / state.duration : 0;
  const isPlaying = state?.playerState === "playing";
  // Prefer whatever Kaset gave us; fall back to the album resolved from search.
  const albumText = track.album || album;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {/* Each row costs height the artwork cannot have, so the playing
              state is carried in the label slot of the progress row instead of
              getting a row of its own. Keep every label short: Raycast divides
              the row between label and value, and a longer label shrinks the
              value column and truncates it sooner. */}
          <Detail.Metadata.Label title="Track" text={track.name} />
          <Detail.Metadata.Label title="Artist" text={track.artist} />
          {albumText ? (
            <Detail.Metadata.Label title="Album" text={albumText} />
          ) : null}
          {state ? (
            <Detail.Metadata.Label
              title={isPlaying ? "Playing" : "Paused"}
              text={`${formatTime(state.position)} / ${formatTime(state.duration)}`}
              icon={getProgressIcon(progress, Color.PrimaryText)}
            />
          ) : null}
          {!state && track.duration ? (
            <Detail.Metadata.Label
              title="Duration"
              text={formatTime(track.duration)}
            />
          ) : null}
        </Detail.Metadata>
      }
    />
  );
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]()#|])/g, "\\$1");
}

// Kaset hands back a 60px thumbnail; ask the CDN for a larger source so the
// artwork is crisp rather than an upscale, then let Raycast scale it down.
function artworkURL(url: string, size: number): string {
  const source = url.replace(/=w\d+-h\d+/, `=w${size * 2}-h${size * 2}`);
  return `${source}?raycast-width=${size}&raycast-height=${size}`;
}

// Full-screen view pushed from the current track, mirroring the Spotify
// extension's layout: text and artwork on the left, metadata in a right-hand
// column. This is only reachable with the standalone `Detail` component —
// inside a List's detail pane Raycast renders metadata underneath the markdown
// and offers no right-hand column. The List itself is untouched underneath.
function TrackInfoView({
  track,
  onRevalidate,
}: {
  track: Track;
  onRevalidate: () => void;
}) {
  const { data: liveState, revalidate: refreshState } =
    usePromise(getKasetState);

  useEffect(() => {
    const id = setInterval(() => {
      void refreshState();
    }, 1000);
    return () => clearInterval(id);
  }, [refreshState]);

  // Follow the player if the track changes while this view is open.
  const current = liveState?.currentTrack ?? track;
  const resolvedAlbum = useResolvedAlbum(current);
  const albumText = current.album || resolvedAlbum;
  const size = 280;
  const artwork = current.artworkURL
    ? `![Artwork](${artworkURL(current.artworkURL, size)})`
    : "";
  const markdown = `# ${escapeMarkdown(current.name)}\n\nby ${escapeMarkdown(current.artist)}\n\n${artwork}`;

  const progress =
    liveState && liveState.duration > 0
      ? liveState.position / liveState.duration
      : 0;
  const isPlaying = liveState?.playerState === "playing";

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {albumText ? (
            <Detail.Metadata.Label title="Album" text={albumText} />
          ) : null}
          {liveState ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Progress"
                text={`${formatTime(liveState.position)} / ${formatTime(liveState.duration)}`}
                icon={getProgressIcon(progress, Color.PrimaryText)}
              />
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item
                  text={isPlaying ? "Playing" : "Paused"}
                  color={isPlaying ? Color.Green : Color.Orange}
                />
              </Detail.Metadata.TagList>
            </>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        liveState ? (
          <CurrentTrackActions
            track={current}
            state={liveState}
            onRevalidate={onRevalidate}
          />
        ) : undefined
      }
    />
  );
}

function CurrentTrackActions({
  track,
  state,
  onRevalidate,
}: {
  track: Track;
  state: KasetState;
  onRevalidate: () => void;
}) {
  const isPlaying = state.playerState === "playing";
  const isLiked = state.likeStatus === "liked";

  return (
    <ActionPanel>
      <ActionPanel.Section title="Playback">
        <Action
          title={isPlaying ? "Pause" : "Play"}
          icon={isPlaying ? Icon.Pause : Icon.Play}
          onAction={async () => {
            await playPause();
            onRevalidate();
          }}
        />
        <Action
          title="Next Track"
          icon={Icon.Forward}
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          onAction={async () => {
            await nextTrack();
            onRevalidate();
          }}
        />
        <Action
          title="Previous Track"
          icon={Icon.Rewind}
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          onAction={async () => {
            await previousTrack();
            onRevalidate();
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Track">
        <Action.Push
          title="Track Info"
          icon={Icon.Eye}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          target={<TrackInfoView track={track} onRevalidate={onRevalidate} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Rating">
        <Action
          title={isLiked ? "Unlike" : "Like"}
          icon={isLiked ? Icon.HeartDisabled : Icon.Heart}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={async () => {
            await likeTrack();
            onRevalidate();
          }}
        />
        <Action
          title="Dislike"
          icon={Icon.HeartDisabled}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={async () => {
            await dislikeTrack();
            onRevalidate();
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Modes">
        <Action
          title={state.shuffling ? "Shuffle Off" : "Shuffle On"}
          icon={Icon.Shuffle}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={async () => {
            await toggleShuffle();
            onRevalidate();
          }}
        />
        <Action
          title={`Repeat: ${repeatLabel(state.repeating)}`}
          icon={Icon.Repeat}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={async () => {
            await cycleRepeat();
            onRevalidate();
          }}
        />
        <Action
          title={state.muted ? "Unmute" : "Mute"}
          icon={state.muted ? Icon.SpeakerOff : Icon.SpeakerHigh}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          onAction={async () => {
            await toggleMute();
            onRevalidate();
          }}
        />
        <Action
          title="Set Volume…"
          icon={Icon.SpeakerHigh}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          onAction={() =>
            launchCommand({ name: "volume", type: LaunchType.UserInitiated })
          }
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Queue">
        <Action
          title="Play Song…"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() =>
            launchCommand({ name: "play-song", type: LaunchType.UserInitiated })
          }
        />
        <Action
          title="Add to Queue…"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          onAction={() =>
            launchCommand({
              name: "play-song",
              type: LaunchType.UserInitiated,
              context: { mode: "add" },
            })
          }
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Link"
          icon={Icon.Link}
          content={`https://youtu.be/${track.id}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={onRevalidate}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function QueueRowActions({
  track,
  index,
  onRevalidate,
}: {
  track: Track & { audioVideoId?: string };
  index: number;
  onRevalidate: () => void;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Queue">
        <Action
          title="Play Now"
          icon={Icon.Play}
          onAction={async () => {
            // Re-resolve against the freshest queue so indices cannot drift.
            const fresh = await getPlayQueue();
            const resolved =
              (fresh?.tracks.findIndex((entry) => entry.id === track.id) ??
                -1) + 1;
            await playTrackAtIndex(resolved > 0 ? resolved : index);
            onRevalidate();
          }}
        />
        <Action
          title="Remove from Queue"
          icon={Icon.XMarkCircle}
          onAction={async () => {
            // Re-fetch first, then remove by the freshest id (spec fallback).
            const fresh = await getPlayQueue();
            const entry = fresh?.tracks.find((row) => row.id === track.id);
            await removeFromQueue(
              entry?.audioVideoId ??
                entry?.id ??
                track.audioVideoId ??
                track.id,
            );
            onRevalidate();
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Link"
          icon={Icon.Link}
          content={`https://youtu.be/${track.id}`}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function repeatLabel(mode: KasetState["repeating"]): string {
  return mode === "off" ? "Off" : mode === "all" ? "All" : "One";
}
