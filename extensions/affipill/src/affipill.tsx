import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Icon,
  Image,
  List,
  open,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { existsSync } from "fs";
import { useEffect, useState } from "react";
import { AddTrackForm } from "./add-track-form";
import { getPlaybackState, PlaybackState, playTrack, stopPlayback } from "./audio";
import { EditTrackForm } from "./edit-track-form";
import { formatDuration } from "./format";
import { ImportFolder } from "./import-folder";
import { deleteTrack, ensureTracksDirectory, getTrackById, getTracks } from "./library";
import { Track } from "./types";

function getTrackIcon(track: Track, isPlaying: boolean): Image.ImageLike {
  if (isPlaying) {
    return Icon.SpeakerOn;
  }

  if (track.coverPath && existsSync(track.coverPath)) {
    return track.coverPath;
  }

  return Icon.Music;
}

function TrackLibraryActions({ onSaved }: { onSaved: () => void }) {
  return (
    <>
      <ActionPanel.Section>
        <Action.Push
          title="Import Tracks"
          icon={Icon.NewDocument}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          target={<ImportFolder onSaved={onSaved} />}
        />
        <Action.Push
          title="Add Track"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={<AddTrackForm onSaved={onSaved} />}
        />
      </ActionPanel.Section>
      <LibraryFolderActions />
    </>
  );
}

function LibraryFolderActions() {
  return (
    <ActionPanel.Section title="Library Folder">
      <Action
        title="Open Library Folder"
        icon={Icon.Finder}
        onAction={async () => {
          const directory = await ensureTracksDirectory();
          await open(directory);
        }}
      />
      <Action title="Change Library Folder" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}

export default function Command() {
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const {
    data: tracks = [],
    isLoading,
    revalidate,
  } = usePromise(async () => {
    const [library, playbackState] = await Promise.all([getTracks(), getPlaybackState()]);
    setPlayback(playbackState);
    return library;
  }, []);

  useEffect(() => {
    void getPlaybackState().then(setPlayback);
  }, [tracks]);

  useEffect(() => {
    if (!playback) {
      return;
    }

    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [playback]);

  const playingTrackId = playback?.trackId ?? null;

  function getElapsedLabel(track: Track): string {
    const durationLabel = track.durationSeconds !== undefined ? formatDuration(track.durationSeconds) : "--:--";

    if (!playback) {
      return durationLabel;
    }

    const elapsedSeconds = Math.max(0, (now - playback.startedAt) / 1000);
    const clampedSeconds =
      track.durationSeconds !== undefined ? Math.min(elapsedSeconds, track.durationSeconds) : elapsedSeconds;

    return `${formatDuration(clampedSeconds)} / ${durationLabel}`;
  }

  async function handlePlay(track: Track) {
    try {
      await playTrack(track.id, track.audioPath);
      setPlayback(await getPlaybackState());
      await showHUD(`Playing ${track.title}`);
      await closeMainWindow();
    } catch (error) {
      await showFailureToast(error, { title: "Could not play track" });
    }
  }

  async function handleStop(title?: string) {
    await stopPlayback();
    setPlayback(null);
    await showHUD(title ? `Stopped ${title}` : "Stopped playback");
    await closeMainWindow();
  }

  async function handleDelete(track: Track) {
    const confirmed = await confirmAlert({
      title: `Delete "${track.title}"?`,
      message: "This removes the track and its saved audio and cover files.",
      primaryAction: {
        title: "Delete Track",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    if (playingTrackId === track.id) {
      await stopPlayback();
      setPlayback(null);
    }

    await deleteTrack(track.id);
    await showToast({ style: Toast.Style.Success, title: "Track deleted" });
    await revalidate();
  }

  const playingTrack = playingTrackId ? getTrackById(tracks, playingTrackId) : undefined;
  const onSaved = () => void revalidate();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search affirmation tracks..."
      actions={
        <ActionPanel>
          <TrackLibraryActions onSaved={onSaved} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.PlusCircle}
        title="No tracks yet"
        description="Import audio files and matching covers, or add a single track."
        actions={
          <ActionPanel>
            <TrackLibraryActions onSaved={onSaved} />
          </ActionPanel>
        }
      />

      {playingTrack && (
        <List.Section title="Now Playing">
          <List.Item
            icon={getTrackIcon(playingTrack, true)}
            title={playingTrack.title}
            subtitle={playingTrack.subtitle ?? "Playing in the background"}
            accessories={[{ text: getElapsedLabel(playingTrack) }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Stop Playback" icon={Icon.Stop} onAction={() => void handleStop(playingTrack.title)} />
                </ActionPanel.Section>
                <TrackLibraryActions onSaved={onSaved} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {tracks.length > 0 && (
        <List.Section title="Affirmation Tracks">
          {tracks.map((track) => {
            const isPlaying = playingTrackId === track.id;

            return (
              <List.Item
                key={track.id}
                icon={getTrackIcon(track, isPlaying)}
                title={track.title}
                subtitle={track.subtitle}
                accessories={
                  isPlaying
                    ? [{ text: getElapsedLabel(track) }, { tag: { value: "Playing", color: "#34C759" } }]
                    : track.durationSeconds !== undefined
                      ? [{ text: formatDuration(track.durationSeconds) }]
                      : undefined
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title={isPlaying ? "Restart Track" : "Play in Background"}
                        icon={Icon.Play}
                        onAction={() => void handlePlay(track)}
                      />
                      <Action.Push
                        title="Edit Track"
                        icon={Icon.Pencil}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        target={<EditTrackForm track={track} onSaved={onSaved} />}
                      />
                      {isPlaying && (
                        <Action title="Stop Playback" icon={Icon.Stop} onAction={() => void handleStop(track.title)} />
                      )}
                      <Action
                        title="Delete Track"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                        onAction={() => void handleDelete(track)}
                      />
                    </ActionPanel.Section>
                    <TrackLibraryActions onSaved={onSaved} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
