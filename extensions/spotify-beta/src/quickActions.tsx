import { useEffect } from "react";
import {
  Action,
  ActionPanel,
  LaunchProps,
  List,
  showHUD,
  Icon,
  environment,
  Clipboard,
  Image,
  Color,
} from "@raycast/api";
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
import { getError, getErrorMessage } from "./helpers/getError";

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
  icon?: Icon | Image.ImageLike;
  onAction: (action?: string) => Promise<void>;
};

function createDeeplink(extensionName: string, commandName: string, actionName: string, raycastVersion: string) {
  const protocol = raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
  const baseLink = `${protocol}extensions/mattisssa/${extensionName}/${commandName}`;
  const context = encodeURIComponent(JSON.stringify({ action: actionName }));
  const deeplink = `${baseLink}?launchContext=${context}`;
  return deeplink;
}

function QuickActionsCommand(props: Props) {
  const action = props.launchContext?.action;
  const { extensionName, commandName, raycastVersion } = environment;

  const { currentlyPlayingData, currentlyPlayingRevalidate } = useCurrentlyPlaying();
  const { playbackStateData, playbackStateRevalidate } = usePlaybackState();
  const nothingIsPlaying = !currentlyPlayingData || !currentlyPlayingData?.item;
  const isPlaying = playbackStateData?.is_playing;
  const isTrack = currentlyPlayingData?.currently_playing_type !== "episode";
  const trackId = currentlyPlayingData?.item?.id;

  const actions: Action[] = [
    {
      name: "play",
      title: "Play",
      description: "Play the currently paused song/episode",
      icon: Icon.Play,
      onAction: async () => {
        await playbackStateRevalidate();

        if (isPlaying) {
          return await showHUD("Playing");
        }

        try {
          await play();
          await playbackStateRevalidate();
          await showHUD("Playing");
        } catch (err) {
          const error = getErrorMessage(err);
          await showHUD(error);
        }
      },
    },
    {
      name: "pause",
      title: "Pause",
      description: "Pause the currently playing song/episode",
      icon: Icon.Pause,
      onAction: async () => {
        await currentlyPlayingRevalidate();
        await playbackStateRevalidate();

        if (nothingIsPlaying) {
          return await showHUD("Nothing is currently playing");
        }

        if (!isPlaying) {
          return await showHUD("Paused");
        }

        try {
          await pause();
          await playbackStateRevalidate();
          await showHUD("Paused");
        } catch (err) {
          const error = getErrorMessage(err);
          await showHUD(error);
        }
      },
    },
    {
      name: "togglePlayPause",
      title: "Toggle Play/Pause",
      description: "Toggle play/pause the currently playing song/episode",
      icon: {
        source: "play-pause-16.svg",
        tintColor: Color.PrimaryText,
      },
      onAction: async () => {
        await playbackStateRevalidate();

        if (isPlaying) {
          try {
            await pause();
            await playbackStateRevalidate();
            await showHUD("Paused");
          } catch (err) {
            const error = getError(err);
            await showHUD(error.message);
          }
        } else {
          try {
            await play();
            await playbackStateRevalidate();
            await showHUD("Playing");
          } catch (err) {
            const error = getError(err);
            await showHUD(error.message);
          }
        }
      },
    },
    {
      name: "like",
      title: "Like",
      description: "Like the current track",
      icon: Icon.Heart,
      onAction: async () => {
        await currentlyPlayingRevalidate();

        if (nothingIsPlaying) {
          return await showHUD("Nothing is currently playing");
        }

        if (!isTrack) {
          return await showHUD("Liking episodes is not supported yet");
        }

        try {
          await addToMySavedTracks({
            trackIds: trackId ? [trackId] : [],
          });
          await showHUD(`Liked ${currentlyPlayingData?.item.name}`);
        } catch (error) {
          await showHUD("Nothing is currently playing");
        }
      },
    },
    {
      name: "dislike",
      title: "Dislike",
      description: "Dislike the current track",
      icon: Icon.HeartDisabled,
      onAction: async () => {
        await currentlyPlayingRevalidate();

        if (nothingIsPlaying) {
          return await showHUD("Nothing is currently playing");
        }

        if (!isTrack) {
          return await showHUD("Liking episodes is not supported yet");
        }

        try {
          await removeFromMySavedTracks({
            trackIds: trackId ? [trackId] : [],
          });
          await showHUD(`Disliked ${currentlyPlayingData?.item.name}`);
        } catch (error) {
          await showHUD("Nothing is currently playing");
        }
      },
    },
    {
      name: "next",
      title: "Next",
      description: "Skip to the next track",
      icon: Icon.Forward,
      onAction: async () => {
        await currentlyPlayingRevalidate();

        if (nothingIsPlaying) {
          return await showHUD("Nothing is currently playing");
        }

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
        await currentlyPlayingRevalidate();

        if (nothingIsPlaying) {
          return await showHUD("Nothing is currently playing");
        }

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
          await playbackStateRevalidate();
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
          await playbackStateRevalidate();
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
          await playbackStateRevalidate();
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
          await playbackStateRevalidate();
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
          await playbackStateRevalidate();
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
          await playbackStateRevalidate();
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
        await playbackStateRevalidate();
        const shuffleState = playbackStateData?.shuffle_state;
        try {
          await shuffle(!shuffleState);
          await showHUD(`Shuffle is ${shuffleState ? "off" : "on"}`);
          await playbackStateRevalidate();
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
        await playbackStateRevalidate();
        const repeatState = playbackStateData?.repeat_state;
        try {
          await repeat(repeatState === "off" ? "context" : "off");
          await showHUD(`Repeat is ${repeatState === "off" ? "on" : "off"}`);
          await playbackStateRevalidate();
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
        await currentlyPlayingRevalidate();
        if (nothingIsPlaying) {
          return await showHUD("Nothing is currently playing");
        }

        if (!isTrack && !trackId) {
          return await showHUD("Radio based on episodes isn't available yet");
        }

        try {
          await startRadio({
            trackIds: trackId ? [trackId] : undefined,
          });
          await showHUD("Playing Radio");
        } catch (err) {
          const error = getErrorMessage(err);
          await showHUD(error);
        }
      },
    },
    {
      name: "copyUrl",
      title: "Copy URL",
      description: "Copy the URL of the currently playing song/episode",
      icon: Icon.Link,
      onAction: async () => {
        await currentlyPlayingRevalidate();
        if (nothingIsPlaying) {
          return await showHUD("Nothing is currently playing");
        }

        const external_urls = currentlyPlayingData.item.external_urls;
        const title = currentlyPlayingData.item.name;
        await Clipboard.copy({
          html: `<a href=${external_urls?.spotify}>${title}</a>`,
          text: external_urls?.spotify,
        });
        showHUD("Copied URL to clipboard");
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
                  link: createDeeplink(extensionName, commandName, action.name, raycastVersion),
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
