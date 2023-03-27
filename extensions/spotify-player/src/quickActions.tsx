import { useEffect } from "react";
import { Action, ActionPanel, LaunchProps, List, showHUD, Icon, environment, Clipboard } from "@raycast/api";
import { play } from "./api/play";
import { addToMySavedTracks } from "./api/addToMySavedTracks";
import { removeFromMySavedTracks } from "./api/removeFromMySavedTracks";
import { skipToNext } from "./api/skipToNext";
import { skipToPrevious } from "./api/skipToPrevious";
import { pause } from "./api/pause";
import { changeVolume } from "./api/changeVolume";
import { shuffle } from "./api/shuffle";
import { repeat } from "./api/repeat";
import { startRadio } from "./api/startRadio";
import { View } from "./components/View";
import { useCurrentlyPlaying } from "./hooks/useCurrentlyPlaying";
import { usePlaybackState } from "./hooks/usePlaybackState";

type Actions =
  | "play"
  | "pause"
  | "togglePlayPause"
  | "like"
  | "dislike"
  | "next"
  | "previous"
  | "volume0"
  | "volume33"
  | "volume66"
  | "volume100"
  | "volumeUp"
  | "volumeDown"
  | "shuffle"
  | "repeat"
  | "radio"
  | "copyUrl";
type Props = LaunchProps<{ launchContext: { action: Actions } }>;
type Action = {
  name: Actions;
  title: string;
  description: string;
  icon?: Icon | string;
  onAction: (action?: string) => Promise<void>;
};

function createDeeplink(extensionName: string, commandName: string, actionName: string, isDevelopment: boolean) {
  const protocol = isDevelopment ? "raycastinternal://" : "raycast://";
  const baseLink = `${protocol}extensions/raycast/${extensionName}/${commandName}`;
  const context = encodeURIComponent(JSON.stringify({ action: actionName }));
  const deeplink = `${baseLink}?launchContext=${context}`;
  return deeplink;
}

function QuickActionsCommand(props: Props) {
  const action = props.launchContext?.action;
  const { extensionName, commandName, isDevelopment } = environment;

  const { currentPlayingData, currentPlayingRevalidate } = useCurrentlyPlaying();
  const { playbackStateData, revalidatePlaybackState } = usePlaybackState();
  const isTrack = currentPlayingData?.currently_playing_type !== "episode";
  const trackId = currentPlayingData?.item?.id;

  const actions: Action[] = [
    {
      name: "play",
      title: "Play",
      description: "Play the currently paused song/episode",
      icon: Icon.Play,
      onAction: async () => {
        await play();
        await showHUD("Playing");
      },
    },
    {
      name: "pause",
      title: "Pause",
      description: "Pause the currently playing song/episode",
      icon: Icon.Pause,
      onAction: async () => {
        await pause();
        await showHUD("Paused");
      },
    },
    {
      name: "togglePlayPause",
      title: "Toggle Play/Pause",
      description: "Toggle play/pause the currently playing song/episode",
      icon: "play-pause-16.svg",
      onAction: async () => {
        const isPlaying = currentPlayingData?.is_playing;
        if (isPlaying) {
          await pause();
          await currentPlayingRevalidate();
          await showHUD("Paused");
        } else {
          await play();
          await currentPlayingRevalidate();
          await showHUD("Playing");
        }
      },
    },
    {
      name: "like",
      title: "Like",
      description: "Like the current track",
      icon: Icon.Heart,
      onAction: async () => {
        if (isTrack) {
          try {
            await addToMySavedTracks({
              trackIds: trackId ? [trackId] : [],
            });
            await showHUD(`Liked ${currentPlayingData?.item.name}`);
          } catch (error) {
            await showHUD("Nothing is currently playing");
          }
        } else {
          await showHUD("Liking episodes is not supported yet");
        }
      },
    },
    {
      name: "dislike",
      title: "Dislike",
      description: "Dislike the current track",
      icon: Icon.HeartDisabled,
      onAction: async () => {
        if (isTrack) {
          try {
            await removeFromMySavedTracks({
              trackIds: trackId ? [trackId] : [],
            });
            await showHUD(`Disliked ${currentPlayingData?.item.name}`);
          } catch (error) {
            await showHUD("Nothing is currently playing");
          }
        } else {
          await showHUD("Disliking episodes is not supported yet");
        }
      },
    },
    {
      name: "next",
      title: "Next",
      description: "Skip to the next track",
      icon: Icon.Forward,
      onAction: async () => {
        if (isTrack) {
          try {
            await skipToNext();
            await showHUD("Skipped to next");
          } catch (error) {
            await showHUD("Nothing is currently playing");
          }
        } else {
          await showHUD("Skipping episodes isn't available yet");
        }
      },
    },
    {
      name: "previous",
      title: "Previous",
      description: "Skip to the previous track",
      icon: Icon.Rewind,
      onAction: async () => {
        if (isTrack) {
          try {
            await skipToPrevious();
            await showHUD("Skipped to previous");
          } catch (error) {
            await showHUD("Nothing is currently playing");
          }
        } else {
          await showHUD("Skipping episodes isn't available yet");
        }
      },
    },
    {
      name: "volume0",
      title: "Volume Mute",
      description: "Change the volume to 0%",
      icon: Icon.SpeakerOff,
      onAction: async () => {
        try {
          await changeVolume(0);
          await revalidatePlaybackState();
          await showHUD("Volume changed");
        } catch (error) {
          await showHUD("No active device");
        }
      },
    },
    {
      name: "volume33",
      title: "Volume Low",
      description: "Change the volume to 33%",
      icon: Icon.SpeakerLow,
      onAction: async () => {
        try {
          await changeVolume(33);
          await revalidatePlaybackState();
          await showHUD("Volume changed");
        } catch (error) {
          await showHUD("No active device");
        }
      },
    },
    {
      name: "volume66",
      title: "Volume Medium",
      description: "Change the volume to 66%",
      icon: Icon.SpeakerOn,
      onAction: async () => {
        try {
          await changeVolume(66);
          await revalidatePlaybackState();
          await showHUD("Volume changed");
        } catch (error) {
          await showHUD("No active device");
        }
      },
    },
    {
      name: "volume100",
      title: "Volume High",
      description: "Change the volume to 100%",
      icon: Icon.SpeakerHigh,
      onAction: async () => {
        try {
          await changeVolume(100);
          await revalidatePlaybackState();
          await showHUD("Volume changed");
        } catch (error) {
          await showHUD("No active device");
        }
      },
    },
    {
      name: "volumeUp",
      title: "Volume Up",
      description: "Increase the volume by 10%",
      icon: Icon.SpeakerUp,
      onAction: async () => {
        const volume = playbackStateData?.device?.volume_percent as number;
        if (volume === 100) {
          return await showHUD("Volume is already at 100%");
        }
        try {
          await changeVolume(Math.min(volume + 10, 100));
          await showHUD("Volume changed");
          await revalidatePlaybackState();
        } catch (error) {
          await showHUD("No active device");
        }
      },
    },
    {
      name: "volumeDown",
      title: "Volume Down",
      description: "Decrease the volume by 10%",
      icon: Icon.SpeakerDown,
      onAction: async () => {
        const volume = playbackStateData?.device?.volume_percent as number;
        if (volume === 0) {
          return await showHUD("Volume is already at 0%");
        }
        try {
          await changeVolume(Math.max(volume - 10, 0));
          await showHUD("Volume changed");
          await revalidatePlaybackState();
        } catch (error) {
          await showHUD("No active device");
        }
      },
    },
    {
      name: "shuffle",
      title: "Shuffle",
      description: "Toggle shuffle",
      icon: Icon.Shuffle,
      onAction: async () => {
        const shuffleState = playbackStateData?.shuffle_state;
        try {
          await shuffle(!shuffleState);
          await showHUD(`Shuffle is ${shuffleState ? "off" : "on"}`);
          await revalidatePlaybackState();
        } catch (error) {
          await showHUD("No active device");
        }
      },
    },
    {
      name: "repeat",
      title: "Repeat",
      description: "Toggle repeat",
      icon: Icon.Repeat,
      onAction: async () => {
        const repeatState = playbackStateData?.repeat_state;
        try {
          await repeat(repeatState === "off" ? "context" : "off");
          await showHUD(`Repeat is ${repeatState === "off" ? "on" : "off"}`);
          await revalidatePlaybackState();
        } catch (error) {
          await showHUD("No active device");
        }
      },
    },
    {
      name: "radio",
      title: "Radio",
      description: "Start radio based on the currently playing song",
      icon: Icon.Music,
      onAction: async () => {
        if (isTrack && trackId) {
          try {
            await startRadio({
              trackIds: trackId ? [trackId] : undefined,
            });
            await showHUD("Playing radio");
          } catch (error) {
            await showHUD("Nothing is currently playing");
          }
        } else {
          await showHUD("Radio based on episodes isn't available yet");
        }
      },
    },
    {
      name: "copyUrl",
      title: "Copy URL",
      description: "Copy the URL of the currently playing song/episode",
      icon: Icon.Link,
      onAction: async () => {
        if (currentPlayingData?.item) {
          const external_urls = currentPlayingData.item.external_urls;
          const title = currentPlayingData.item.name;
          await Clipboard.copy({
            html: `<a href=${external_urls?.spotify}>${title}</a>`,
            text: external_urls?.spotify,
          });
          showHUD("Copied URL to clipboard");
        } else {
          await showHUD("No URL to copy");
        }
      },
    },
  ];

  async function doAction(action: Actions) {
    const actionToRun = actions.find((a) => a.name === action);
    if (actionToRun) {
      await actionToRun.onAction();
    }
  }

  useEffect(() => {
    if (action) {
      doAction(action);
    }
  }, [action]);

  return (
    <List>
      {actions.map((action) => (
        <List.Item
          key={action.name}
          icon={action.icon}
          title={action.title}
          subtitle={action.description}
          actions={
            <ActionPanel>
              <Action icon={action.icon} title={action.title} onAction={action.onAction} />
              <Action.CreateQuicklink
                title="Create Quicklink"
                quicklink={{
                  link: createDeeplink(extensionName, commandName, action.name, isDevelopment),
                  name: `Spotify ${action.title}`,
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command(props: Props) {
  return (
    <View>
      <QuickActionsCommand {...props} />
    </View>
  );
}
