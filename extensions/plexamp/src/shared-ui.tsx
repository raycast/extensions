import {
  Action,
  Color,
  environment,
  Icon,
  Keyboard,
  LaunchType,
  List,
  Toast,
  launchCommand,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useState, type ReactElement } from "react";

import { formatDuration, getTrackAccessoryValues } from "./format";
import { getImageUrl, playItem, playNextItem, queueItem } from "./plex";
import type { MusicAlbum, MusicTrack, PlayableItem } from "./types";

export function artworkSource(
  path?: string,
  fallback: Icon = Icon.Music,
  options?: { baseUrl?: string; token?: string },
) {
  const imageUrl = getImageUrl(path, options);
  return imageUrl ? { source: imageUrl } : fallback;
}

export function PreferencesAction(props?: { title?: string }) {
  return (
    <Action title={props?.title ?? "Open Extension Settings"} icon={Icon.Gear} onAction={openExtensionPreferences} />
  );
}

export function NowPlayingAction(props?: { shortcut?: Keyboard.Shortcut }) {
  return (
    <Action
      title="Now Playing"
      icon={Icon.Play}
      shortcut={props?.shortcut}
      onAction={() =>
        void (environment.commandName === "player-controls"
          ? Promise.resolve()
          : launchCommand({
              name: "player-controls",
              type: LaunchType.UserInitiated,
            }))
      }
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

export function albumAccessories(album: Pick<MusicAlbum, "year" | "leafCount" | "duration">): List.Item.Accessory[] {
  return [
    ...(album.year
      ? [
          {
            tag: {
              value: String(album.year),
              color: Color.SecondaryText,
            },
            tooltip: "Year",
          },
        ]
      : []),
    ...(album.leafCount
      ? [
          {
            tag: {
              value: `${album.leafCount} tracks`,
              color: Color.Blue,
            },
            tooltip: "Track Count",
          },
        ]
      : []),
    ...(album.duration
      ? [
          {
            tag: {
              value: formatDuration(album.duration),
              color: Color.Green,
            },
            tooltip: "Album Length",
          },
        ]
      : []),
  ];
}

export function trackAccessories(
  track: Pick<MusicTrack, "audioFormat" | "bitrate" | "duration">,
  options?: { durationText?: string },
): List.Item.Accessory[] {
  const accessories = getTrackAccessoryValues(track, options);

  return [
    ...(accessories.metadataBadge
      ? [
          {
            tag: {
              value: accessories.metadataBadge,
              color: Color.SecondaryText,
            },
            tooltip: "Format and Bitrate",
          },
        ]
      : []),
    ...(accessories.durationText ? [{ text: accessories.durationText }] : []),
  ];
}

export function PlaybackActionItems(props: {
  item: PlayableItem;
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
  browseTarget?: ReactElement;
  browseTitle?: string;
  browseIcon?: Icon;
  nowPlayingShortcut?: Keyboard.Shortcut;
}) {
  const { push } = useNavigation();

  return (
    <>
      {props.browseTarget && props.browseTitle ? (
        <Action
          title={props.browseTitle}
          icon={props.browseIcon ?? Icon.ArrowRight}
          onAction={() => push(props.browseTarget)}
        />
      ) : null}
      <Action title="Play in Plexamp" icon={Icon.Play} onAction={() => props.onPlay(props.item)} />
      <Action title="Add to Queue" icon={Icon.Plus} onAction={() => props.onQueue(props.item)} />
      <Action
        title="Play Next"
        icon={Icon.Forward}
        onAction={() => props.onPlayNext(props.item)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
      />
      <NowPlayingAction shortcut={props.nowPlayingShortcut} />
      <PreferencesAction />
    </>
  );
}

export function usePlaybackActions() {
  const [isPerforming, setIsPerforming] = useState(false);

  const runAction = useCallback(async (action: () => Promise<void>, successTitle: string) => {
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
  }, []);

  return {
    isPerforming,
    play: (item: PlayableItem) => runAction(() => playItem(item), "Playback started in Plexamp"),
    playNext: (item: PlayableItem) => runAction(() => playNextItem(item), "Item added to play next"),
    queue: (item: PlayableItem) => runAction(() => queueItem(item), "Item added to the Plexamp queue"),
  };
}
