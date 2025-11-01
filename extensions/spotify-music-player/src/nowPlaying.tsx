import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useCurrentlyPlaying } from "./hooks/useCurrentlyPlaying";
import { usePlaybackState } from "./hooks/usePlaybackState";
import { View } from "./components/View";
import { TrackObject, EpisodeObject } from "./helpers/spotify.api";
import { pause } from "./api/pause";
import { play } from "./api/play";
import { skipToNext } from "./api/skipToNext";
import { skipToPrevious } from "./api/skipToPrevious";
import { toggleShuffle } from "./api/toggleShuffle";
import { toggleRepeat } from "./api/toggleRepeat";
import { startRadio } from "./api/startRadio";

function NowPlayingCommand() {
  const { currentlyPlayingData, currentlyPlayingIsLoading, currentlyPlayingRevalidate } = useCurrentlyPlaying();
  const { playbackStateData, playbackStateIsLoading, playbackStateRevalidate } = usePlaybackState();

  const isPlaying = playbackStateData?.is_playing;
  const isTrack = currentlyPlayingData?.currently_playing_type !== "episode";
  const shuffleState = playbackStateData?.shuffle_state ?? false;
  const repeatState = playbackStateData?.repeat_state ?? "off";
  const trackUri = isTrack ? (currentlyPlayingData?.item as TrackObject)?.uri : undefined;

  if (!currentlyPlayingData || !currentlyPlayingData.item) {
    return (
      <Detail
        isLoading={currentlyPlayingIsLoading}
        markdown="# Nothing is playing right now\n\nStart playing music on Spotify to see it here."
      />
    );
  }

  const { item } = currentlyPlayingData;
  const { name, external_urls } = item;

  let markdown = "";
  let metadata: React.ReactElement | undefined;

  if (isTrack) {
    const track = item as TrackObject;
    const artistNames = track.artists?.map((artist) => artist.name).join(", ") || "Unknown Artist";
    const albumName = track.album?.name || "Unknown Album";
    const image = track.album?.images?.[0]?.url;

    markdown = [
      image ? `![${name}](${image}?raycast-width=250&raycast-height=250)` : "",
      "",
      `# ${name}`,
      `**${artistNames}**`,
      `*${albumName}*`,
    ].join("\n");

    metadata = (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Title" text={name} />
        <Detail.Metadata.Label title="Artist" text={artistNames} />
        <Detail.Metadata.Label title="Album" text={albumName} />
        {track.duration_ms && (
          <Detail.Metadata.Label
            title="Duration"
            text={`${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, "0")}`}
          />
        )}
      </Detail.Metadata>
    );
  } else {
    const episode = item as EpisodeObject;
    const showName = episode.show?.name || "Unknown Show";
    const description = episode.description || "";
    const image = episode.images?.[0]?.url;

    markdown = [
      image ? `![${name}](${image}?raycast-width=250&raycast-height=250)` : "",
      "",
      `# ${name}`,
      `**${showName}**`,
      "",
      description,
    ].join("\n");

    metadata = (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Title" text={name} />
        <Detail.Metadata.Label title="Show" text={showName} />
      </Detail.Metadata>
    );
  }

  return (
    <Detail
      markdown={markdown}
      metadata={metadata}
      isLoading={currentlyPlayingIsLoading || playbackStateIsLoading}
      actions={
        <ActionPanel>
          {isPlaying ? (
            <Action
              icon={Icon.Pause}
              title="Pause"
              shortcut={{ modifiers: [], key: "return" }}
              onAction={async () => {
                await pause();
                await playbackStateRevalidate();
              }}
            />
          ) : (
            <Action
              icon={Icon.Play}
              title="Play"
              shortcut={{ modifiers: [], key: "return" }}
              onAction={async () => {
                await play();
                await playbackStateRevalidate();
              }}
            />
          )}
          <Action
            icon={Icon.Forward}
            title="Next Track"
            shortcut={{ modifiers: ["ctrl"], key: "arrowRight" }}
            onAction={async () => {
              await skipToNext();
              await currentlyPlayingRevalidate();
            }}
          />
          <Action
            icon={Icon.Rewind}
            title="Previous Track"
            shortcut={{ modifiers: ["ctrl"], key: "arrowLeft" }}
            onAction={async () => {
              await skipToPrevious();
              await currentlyPlayingRevalidate();
            }}
          />
          <Action
            icon={Icon.Repeat}
            title="Refresh"
            shortcut={{ modifiers: ["ctrl"], key: "r" }}
            onAction={async () => {
              await currentlyPlayingRevalidate();
              await playbackStateRevalidate();
            }}
          />
          <Action
            icon={Icon.Shuffle}
            title={shuffleState ? "Turn Shuffle off" : "Turn Shuffle on"}
            onAction={async () => {
              await toggleShuffle(!shuffleState);
              await playbackStateRevalidate();
            }}
          />
          <Action
            icon={Icon.Repeat}
            title={
              repeatState === "off" ? "Repeat Context" : repeatState === "context" ? "Repeat Track" : "Turn Repeat Off"
            }
            onAction={async () => {
              const newState = repeatState === "off" ? "context" : repeatState === "context" ? "track" : "off";
              await toggleRepeat(newState);
              await playbackStateRevalidate();
            }}
          />
          {trackUri && (
            <Action
              icon={Icon.Music}
              title="Start Radio"
              onAction={async () => {
                await startRadio(trackUri);
                await currentlyPlayingRevalidate();
              }}
            />
          )}
          {external_urls?.spotify && (
            <Action.OpenInBrowser
              title="Open in Spotify"
              url={external_urls.spotify}
              shortcut={{ modifiers: ["ctrl"], key: "o" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return (
    <View>
      <NowPlayingCommand />
    </View>
  );
}
