import { Action, Icon, showToast, Toast } from "@raycast/api";
import { playAudio, stopAudio } from "../../lib/audio";
import { usePlaybackState } from "../../lib/hooks";
import { Sample } from "../../lib/types";
import { log } from "../../lib/log";
import { useFavoritesRecents } from "../../lib/hooks";
import { saveFavoriteOrRecent, removeFavoriteOrRecent } from "../../lib/file";
import { useCallback } from "react";

interface PlayStopActionProps {
  sample: Sample;
}

export function PlayStopAction({ sample }: PlayStopActionProps) {
  const isPlaying = usePlaybackState(sample.id);

  const handlePlay = async () => {
    try {
      if (isPlaying) {
        log.debug(`[audio] PlayStopAction: stopping sampleId=${sample.id}`);
        await stopAudio();
      } else {
        log.debug(`[audio] PlayStopAction: playing sampleId=${sample.id}, url=${sample.sample}`);
        await playAudio(sample.sample, sample.id, sample.name);
        // Track usage by adding to recents
        await saveFavoriteOrRecent(sample, "recent");
      }
    } catch (error) {
      log.debug(`[audio] PlayStopAction: error - ${error instanceof Error ? error.message : "Unknown error"}`);
      await showToast({
        title: "Playback Failed",
        message: error instanceof Error ? error.message : "Failed to play audio",
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <Action
      title={isPlaying ? "Stop" : "Play"}
      icon={isPlaying ? Icon.Stop : Icon.Play}
      onAction={handlePlay}
      shortcut={{ modifiers: ["cmd", "shift", "ctrl"], key: "p" }}
    />
  );
}

export function FavoriteActions({ sample }: { sample: Sample }) {
  const { favoriteSampleIds, mutateAll } = useFavoritesRecents();
  const isFavorite = favoriteSampleIds.includes(sample.id);

  const toggleFavorite = useCallback(async () => {
    if (isFavorite) {
      await removeFavoriteOrRecent(sample, "favs");
      await showToast({ style: Toast.Style.Success, title: "Removed from Favorites" });
    } else {
      await saveFavoriteOrRecent(sample, "favs");
      await showToast({ style: Toast.Style.Success, title: "Added to Favorites" });
    }
    await mutateAll();
  }, [isFavorite, sample, mutateAll]);

  return (
    <Action
      icon={Icon.Star}
      title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      onAction={toggleFavorite}
      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
    />
  );
}

export function RecentActions({ sample }: { sample: Sample }) {
  const { recentSampleIds, mutateAll } = useFavoritesRecents();
  const isRecent = recentSampleIds.includes(sample.id);

  const removeRecent = useCallback(async () => {
    if (isRecent) {
      await removeFavoriteOrRecent(sample, "recent");
      await showToast({ style: Toast.Style.Success, title: "Removed from Recents" });
      await mutateAll();
    }
  }, [isRecent, sample, mutateAll]);

  // Only removal is a supported action for recents
  return isRecent ? (
    <Action
      icon={Icon.Clock}
      title="Remove from Recents"
      onAction={removeRecent}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
    />
  ) : null;
}
