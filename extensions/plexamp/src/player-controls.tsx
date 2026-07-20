import { Action, ActionPanel, Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";

import { formatDuration, formatTrackDisplayTitle, getTrackRatingDisplayMode } from "./format";
import {
  clearPlayQueue,
  getMetadataByRatingKey,
  movePlayQueueItem,
  playPause,
  removePlayQueueItem,
  setRepeat,
  setShuffle,
  skipNext,
  skipPrevious,
  skipToQueueItem,
  stop,
} from "./plex";
import { PreferencesAction, artworkSource, trackAccessories } from "./shared-ui";
import type { PlayQueueInfo, MusicTrack } from "./types";
import { useNowPlayingState } from "./use-now-playing-state";
import { usePlexampConnection } from "./use-plexamp-connection";
import { PlexSetupView } from "./plex-setup-view";

function LibraryActions() {
  return (
    <>
      <Action
        title="Search Library"
        icon={Icon.MagnifyingGlass}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        onAction={() =>
          void launchCommand({
            name: "search-tracks",
            type: LaunchType.UserInitiated,
          })
        }
      />
      <Action
        title="Browse Library"
        icon={Icon.List}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
        onAction={() =>
          void launchCommand({
            name: "browse-media",
            type: LaunchType.UserInitiated,
          })
        }
      />
    </>
  );
}

function isShuffleEnabled(shuffle?: string): boolean {
  return shuffle === "1" || shuffle?.toLowerCase() === "true";
}

function getRepeatMode(repeat?: string): "0" | "1" | "2" {
  return repeat === "1" || repeat === "2" ? repeat : "0";
}

function getRepeatAccessoryText(repeat?: string): string {
  switch (getRepeatMode(repeat)) {
    case "1":
      return "Loop one";
    case "2":
      return "Loop all";
    default:
      return "Loop off";
  }
}

async function resolveNavigableTrack(track: MusicTrack): Promise<MusicTrack> {
  if (track.parentRatingKey && track.grandparentRatingKey && track.librarySectionKey) {
    return track;
  }

  const metadata = await getMetadataByRatingKey(track.ratingKey);

  if (!metadata || metadata.type !== "track") {
    throw new Error("Could not load full metadata for this track.");
  }

  return metadata;
}

function getPlaybackStateText(state?: string): string {
  if (!state) {
    return "Unknown";
  }

  return state.charAt(0).toUpperCase() + state.slice(1);
}

export default function Command() {
  const plexamp = usePlexampConnection();
  const [isPerforming, setIsPerforming] = useState(false);
  const { state, isLoading, error, reload } = useNowPlayingState(plexamp.isReachable);

  const runControl = useCallback(
    async (action: () => Promise<void>, successTitle: string) => {
      setIsPerforming(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Sending control command...",
      });

      try {
        await action();
        toast.style = Toast.Style.Success;
        toast.title = successTitle;
        await reload();
      } catch (controlError) {
        toast.style = Toast.Style.Failure;
        toast.title = "Plexamp command failed";
        toast.message = controlError instanceof Error ? controlError.message : String(controlError);
      } finally {
        setIsPerforming(false);
      }
    },
    [reload],
  );

  const ratingDisplayMode = getTrackRatingDisplayMode();
  const currentTitle =
    state.current?.type === "track"
      ? formatTrackDisplayTitle(state.current.title, {
          parentIndex: state.current.parentIndex,
          index: state.current.index,
          userRating: state.current.userRating,
          displayMode: ratingDisplayMode,
        })
      : (state.current?.title ?? "Nothing playing");
  const nowPlayingDetails = useMemo(() => {
    if (!state.current) {
      return {
        subtitle: state.timeline.state === "playing" ? "Playback active" : "Plexamp is idle",
      };
    }

    if (state.current.type === "track") {
      return {
        subtitle: [state.current.grandparentTitle, state.current.parentTitle].filter(Boolean).join(" - "),
      };
    }

    if (state.current.type === "album") {
      return {
        subtitle: state.current.parentTitle ?? state.timeline.state,
      };
    }

    return {
      subtitle: state.timeline.state,
    };
  }, [state.current, state.timeline.state]);

  const progressText = state.timeline.duration
    ? `${formatDuration(state.timeline.time)} / ${formatDuration(state.timeline.duration)}`
    : undefined;
  const progressAccessory = progressText ? [{ text: progressText }] : [];
  const shuffleEnabled = isShuffleEnabled(state.timeline.shuffle);
  const repeatMode = getRepeatMode(state.timeline.repeat);
  const nowPlayingSectionTitle = `Now Playing • ${getRepeatAccessoryText(
    repeatMode,
  )} • ${shuffleEnabled ? "Shuffle on" : "Shuffle off"} • ${getPlaybackStateText(state.timeline.state)}`;
  const currentQueueIndex =
    state.queue?.items.findIndex((track) => track.playQueueItemID === state.timeline.playQueueItemID) ?? -1;
  const upNextItems =
    state.queue && currentQueueIndex >= 0 ? state.queue.items.slice(currentQueueIndex + 1) : (state.queue?.items ?? []);
  const backToItems =
    state.queue && currentQueueIndex > 0 ? [...state.queue.items.slice(0, currentQueueIndex)].reverse() : [];
  const currentTrack = state.current?.type === "track" ? state.current : undefined;
  const playbackArtworkBaseUrl =
    state.timeline.protocol && state.timeline.address && state.timeline.port
      ? `${state.timeline.protocol}://${state.timeline.address}:${state.timeline.port}`
      : undefined;
  const navigateToAlbum = useCallback(async (track: MusicTrack) => {
    const resolvedTrack = await resolveNavigableTrack(track);

    if (!resolvedTrack.parentRatingKey) {
      throw new Error("This track is missing album metadata.");
    }

    if (!resolvedTrack.librarySectionKey) {
      throw new Error("This track is missing library section metadata.");
    }

    const album = await getMetadataByRatingKey(resolvedTrack.parentRatingKey);

    if (!album || album.type !== "album") {
      throw new Error("Could not load the album for this track.");
    }

    await launchCommand({
      name: "browse-media",
      type: LaunchType.UserInitiated,
      context: {
        target: "album",
        ratingKey: album.ratingKey,
        sectionKey: resolvedTrack.librarySectionKey,
      },
    });
  }, []);

  const navigateToArtist = useCallback(async (track: MusicTrack) => {
    const resolvedTrack = await resolveNavigableTrack(track);

    if (!resolvedTrack.grandparentRatingKey) {
      throw new Error("This track is missing artist metadata.");
    }

    if (!resolvedTrack.librarySectionKey) {
      throw new Error("This track is missing library section metadata.");
    }

    const artist = await getMetadataByRatingKey(resolvedTrack.grandparentRatingKey);

    if (!artist || artist.type !== "artist") {
      throw new Error("Could not load the artist for this track.");
    }

    await launchCommand({
      name: "browse-media",
      type: LaunchType.UserInitiated,
      context: {
        target: "artist",
        ratingKey: artist.ratingKey,
        sectionKey: resolvedTrack.librarySectionKey,
      },
    });
  }, []);

  const runNavigation = useCallback(async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Navigation failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  if (plexamp.error) {
    return (
      <PlexSetupView
        navigationTitle="Now Playing"
        problem={plexamp.error}
        onConfigured={async () => {
          await plexamp.reload();
          await reload();
        }}
      />
    );
  }

  function renderClearQueueAction() {
    if (!state.timeline.playQueueID || !state.queue) {
      return null;
    }

    return (
      <Action
        title="Clear Queue"
        icon={Icon.Trash}
        onAction={() =>
          runControl(
            () =>
              clearPlayQueue(
                state.queue!.id,
                state.timeline.playQueueItemID ?? state.queue?.selectedItemID,
                state.timeline,
              ),
            "Queue cleared",
          )
        }
      />
    );
  }

  function renderQueueItems(items: PlayQueueInfo["items"]) {
    return items.map((track) => {
      const queueItems = state.queue?.items ?? [];
      const index = queueItems.findIndex((item) => item.playQueueItemID === track.playQueueItemID);
      const previousTrack = index > 0 ? queueItems[index - 1] : undefined;
      const nextTrack = index >= 0 ? queueItems[index + 1] : undefined;

      return (
        <List.Item
          key={track.playQueueItemID ?? track.ratingKey}
          icon={artworkSource(track.thumb, Icon.Music, {
            baseUrl: playbackArtworkBaseUrl,
          })}
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
              <Action
                title="Jump to Track"
                icon={Icon.Play}
                onAction={() => runControl(() => skipToQueueItem(track), "Skipped to selected track")}
              />
              <Action
                title="Go to Album"
                icon={Icon.Music}
                onAction={() => void runNavigation(() => navigateToAlbum(track))}
              />
              <Action
                title="Go to Artist"
                icon={Icon.Person}
                onAction={() => void runNavigation(() => navigateToArtist(track))}
              />
              {track.playQueueItemID && previousTrack?.playQueueItemID ? (
                <Action
                  title="Move Earlier"
                  icon={Icon.ArrowUp}
                  onAction={() =>
                    runControl(
                      () =>
                        movePlayQueueItem(
                          state.queue!.id,
                          track.playQueueItemID!,
                          index > 1 ? queueItems[index - 2]?.playQueueItemID : undefined,
                          state.timeline,
                        ),
                      "Queue item moved up",
                    )
                  }
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                />
              ) : null}
              {track.playQueueItemID && nextTrack?.playQueueItemID ? (
                <Action
                  title="Move Later"
                  icon={Icon.ArrowDown}
                  onAction={() =>
                    runControl(
                      () =>
                        movePlayQueueItem(
                          state.queue!.id,
                          track.playQueueItemID!,
                          nextTrack.playQueueItemID,
                          state.timeline,
                        ),
                      "Queue item moved down",
                    )
                  }
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                />
              ) : null}
              {track.playQueueItemID ? (
                <Action
                  title="Remove Queue Item"
                  icon={Icon.Trash}
                  onAction={() =>
                    runControl(
                      () => removePlayQueueItem(state.queue!.id, track.playQueueItemID!, state.timeline),
                      "Queue item removed",
                    )
                  }
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                />
              ) : null}
              {renderClearQueueAction()}
              <LibraryActions />
              <PreferencesAction />
            </ActionPanel>
          }
        />
      );
    });
  }

  return (
    <List isLoading={isLoading || isPerforming} searchBarPlaceholder="Inspect the current Plexamp queue">
      {error && state.timeline.state === "error" ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to reach Plexamp"
          description={error}
          actions={
            <ActionPanel>
              <LibraryActions />
              <PreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}

      <List.Section title={nowPlayingSectionTitle}>
        <List.Item
          icon={artworkSource(state.current?.thumb, Icon.Music, {
            baseUrl: playbackArtworkBaseUrl,
          })}
          title={currentTitle}
          subtitle={nowPlayingDetails.subtitle}
          accessories={
            currentTrack ? trackAccessories(currentTrack, { durationText: progressText }) : progressAccessory
          }
          actions={
            <ActionPanel>
              <Action
                title="Play/Pause"
                icon={Icon.Play}
                onAction={() => runControl(() => playPause(), "Playback toggled")}
              />
              {currentTrack ? (
                <Action
                  title="Go to Album"
                  icon={Icon.Music}
                  onAction={() => void runNavigation(() => navigateToAlbum(currentTrack))}
                />
              ) : null}
              <Action
                title={shuffleEnabled ? "Disable Shuffle" : "Enable Shuffle"}
                icon={Icon.Switch}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={() =>
                  runControl(() => setShuffle(!shuffleEnabled), shuffleEnabled ? "Shuffle disabled" : "Shuffle enabled")
                }
              />
              <Action
                title={repeatMode === "0" ? "Set Loop All" : repeatMode === "2" ? "Set Loop One" : "Turn Loop Off"}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
                onAction={() =>
                  runControl(
                    () => setRepeat(repeatMode === "0" ? "2" : repeatMode === "2" ? "1" : "0"),
                    repeatMode === "0" ? "Loop all enabled" : repeatMode === "2" ? "Loop one enabled" : "Loop disabled",
                  )
                }
              />
              {currentTrack ? (
                <Action
                  title="Go to Artist"
                  icon={Icon.Person}
                  onAction={() => void runNavigation(() => navigateToArtist(currentTrack))}
                />
              ) : null}
              <Action
                title="Next Track"
                icon={Icon.Forward}
                onAction={() => runControl(() => skipNext(), "Skipped to next track")}
              />
              <Action
                title="Previous Track"
                icon={Icon.Rewind}
                onAction={() => runControl(() => skipPrevious(), "Returned to previous track")}
              />
              <Action title="Stop" icon={Icon.Stop} onAction={() => runControl(() => stop(), "Playback stopped")} />
              {renderClearQueueAction()}
              <LibraryActions />
              <PreferencesAction />
            </ActionPanel>
          }
        />
      </List.Section>

      {state.timeline.playQueueID && state.queue ? (
        <>
          <List.Section title="Up Next">
            {upNextItems.length > 0 ? renderQueueItems(upNextItems) : <List.Item title="No upcoming tracks" />}
          </List.Section>
          <List.Section title="Back To">
            {backToItems.length > 0 ? renderQueueItems(backToItems) : <List.Item title="No previous tracks" />}
          </List.Section>
        </>
      ) : state.timeline.playQueueID ? (
        <List.Section title="Up Next">
          <List.Item
            icon={Icon.List}
            title="Queue unavailable"
            subtitle={error ?? "The current play queue has not loaded yet."}
            actions={
              <ActionPanel>
                {renderClearQueueAction()}
                <LibraryActions />
                <PreferencesAction />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}
