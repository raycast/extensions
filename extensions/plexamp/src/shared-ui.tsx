import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useState } from "react";

import { getImageUrl, playItem, playNextItem, queueItem } from "./plex";
import type { PlayableItem } from "./types";

export function artworkSource(path?: string, fallback: Icon = Icon.Music) {
  const imageUrl = getImageUrl(path);
  return imageUrl ? { source: imageUrl } : fallback;
}

export function PreferencesAction(props?: { title?: string }) {
  return (
    <Action
      title={props?.title ?? "Open Extension Settings"}
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
    />
  );
}

export function librarySetupDescription(problem?: string) {
  const details = [
    "Sign in with Plex from the in-command setup flow.",
    "Verify `Plexamp URL Override` if your player is not on the default local endpoint.",
  ];

  if (!problem) {
    return `Configure the Plex connection and choose a default music library.\n\n${details.join("\n")}`;
  }

  return `${problem}\n\n${details.join("\n")}`;
}

export function SetupEmptyView(props: { problem?: string }) {
  return (
    <List.EmptyView
      icon={Icon.Gear}
      title="Finish Plex Setup"
      description={librarySetupDescription(props.problem)}
      actions={
        <ActionPanel>
          <PreferencesAction />
        </ActionPanel>
      }
    />
  );
}

export function usePlaybackActions() {
  const [isPerforming, setIsPerforming] = useState(false);

  const runAction = useCallback(
    async (action: () => Promise<void>, successTitle: string) => {
      setIsPerforming(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Contacting Plexamp...",
      });

      try {
        await action();
        toast.style = Toast.Style.Success;
        toast.title = successTitle;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Plexamp request failed";
        toast.message = error instanceof Error ? error.message : String(error);
      } finally {
        setIsPerforming(false);
      }
    },
    [],
  );

  return {
    isPerforming,
    play: (item: PlayableItem) =>
      runAction(() => playItem(item), "Playback started in Plexamp"),
    playNext: (item: PlayableItem) =>
      runAction(() => playNextItem(item), "Item added to play next"),
    queue: (item: PlayableItem) =>
      runAction(() => queueItem(item), "Item added to the Plexamp queue"),
  };
}
