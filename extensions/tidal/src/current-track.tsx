import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { getCurrentTrack, sendCommand, type Track } from "./lib/utils";

export default function CurrentTrackCommand() {
  const [track, setTrack] = useState<Track | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrack = async () => {
    const data = await getCurrentTrack();
    setTrack(data);
    setIsLoading(false);
  };

  const handleCommand = async (action: string) => {
    await sendCommand(action);
    setTimeout(fetchTrack, 2000);
  };

  useEffect(() => {
    fetchTrack();
    const interval = setInterval(fetchTrack, 2000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!track) {
    return (
      <List>
        <List.Item
          title="No Track Playing"
          subtitle="Open Tidal and start playing music"
          icon={{ source: Icon.Music, tintColor: Color.Orange }}
        />
      </List>
    );
  }

  return (
    <List>
      <List.Section title="Current Track">
        <List.Item
          title={track.title}
          subtitle={`by ${track.artist}`}
          icon={{ source: track.isLiked ? Icon.Heart : Icon.Music, tintColor: track.isLiked ? Color.Red : Color.Blue }}
          accessories={[
            { text: track.isPlaying ? "Playing" : "Paused" },
            {
              icon: {
                source: track.isPlaying ? Icon.Play : Icon.Pause,
                tintColor: track.isPlaying ? Color.Green : Color.Orange,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={track.isPlaying ? "Pause" : "Play"}
                onAction={() => handleCommand(track.isPlaying ? "pause" : "play")}
                icon={track.isPlaying ? Icon.Pause : Icon.Play}
              />
              <Action title="Previous" onAction={() => handleCommand("previous")} icon={Icon.Rewind} />
              <Action title="Next" onAction={() => handleCommand("next")} icon={Icon.Forward} />
            </ActionPanel>
          }
        />

        <List.Item
          title="Duration"
          subtitle={`${track.currentTime} / ${track.duration}`}
          icon={{ source: Icon.Clock, tintColor: Color.Blue }}
        />

        {track.playingFrom && (
          <List.Item
            title="Playing From"
            subtitle={track.playingFrom}
            icon={{ source: Icon.List, tintColor: Color.Purple }}
          />
        )}
      </List.Section>

      <List.Section title="Controls">
        <List.Item
          title={track.isLiked ? "Unlike" : "Like"}
          icon={{ source: track.isLiked ? Icon.HeartDisabled : Icon.Heart, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title={track.isLiked ? "Unlike" : "Like"} onAction={() => handleCommand("toggleLike")} />
            </ActionPanel>
          }
        />

        <List.Item
          title={`Shuffle: ${track.isShuffled ? "On" : "Off"}`}
          icon={{ source: Icon.Shuffle, tintColor: track.isShuffled ? Color.Green : Color.SecondaryText }}
          actions={
            <ActionPanel>
              <Action title="Toggle Shuffle" onAction={() => handleCommand("toggleShuffle")} />
            </ActionPanel>
          }
        />

        <List.Item
          title={`Repeat: ${track.repeatMode.charAt(0).toUpperCase() + track.repeatMode.slice(1)}`}
          icon={{ source: Icon.Repeat, tintColor: track.repeatMode !== "off" ? Color.Green : Color.SecondaryText }}
          actions={
            <ActionPanel>
              <Action title="Toggle Repeat" onAction={() => handleCommand("toggleRepeat")} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
