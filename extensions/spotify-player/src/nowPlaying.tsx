import { useEffect, useState } from "react";
import {
  open,
  showToast,
  Toast,
  showHUD,
  Clipboard,
  Icon,
  Color,
  Detail,
  closeMainWindow,
  Action,
  ActionPanel,
  popToRoot,
} from "@raycast/api";
import {
  startPlaySimilar,
  useNowPlaying,
  pause,
  play,
  skipToNext,
  skipToPrevious,
  addToSavedTracks,
  removeFromSavedTracks,
} from "./spotify/client";
import { SpotifyProvider, useSpotify } from "./utils/context";

function isTrack(item: unknown): item is SpotifyApi.TrackObjectFull {
  return item !== undefined && (item as SpotifyApi.TrackObjectFull).album !== undefined;
}

function NowPlaying() {
  const { installed } = useSpotify();
  const response = useNowPlaying();
  const [isPaused, setIsPaused] = useState(response.result?.is_playing === false);

  useEffect(() => setIsPaused(response.result?.is_playing === false), [response.result?.is_playing]);

  if (response.error) {
    showToast(Toast.Style.Failure, "Now Playing has failed", response.error);
  }

  if (response.isLoading) {
    return <Detail isLoading />;
  }

  const isIdle = response.result && Object.keys(response.result).length === 0;

  if (isIdle) {
    return <Detail markdown={`# Nothing is playing right now`} />;
  }

  if (!response.result) {
    return <Detail markdown={`# Something is wrong`} />;
  }

  if (!isTrack(response.result.item)) {
    return <Detail markdown={`# Podcast \n We currently don't support podcasts in "Now Playing".`} />;
  }

  const { item } = response.result;
  const { name: trackName, album, artists, id: trackId, external_urls } = item;

  const albumName = album.name;
  const albumImage = album.images[0].url;
  const artistName = artists[0]?.name;
  const artistId = artists[0]?.id;

  const markdown = `# ${trackName}
by ${artistName}

![${trackName}](${albumImage}?raycast-width=250&raycast-height=250)
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Track" text={trackName} />
          <Detail.Metadata.Label title="Artist" text={artistName} />
          <Detail.Metadata.Label title="Album" text={albumName} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!isPaused && (
            <Action
              icon={Icon.PauseFilled}
              title="Pause"
              onAction={async () => {
                await pause();
                await closeMainWindow();
                await popToRoot();
              }}
            />
          )}
          {isPaused && (
            <Action
              icon={Icon.PlayFilled}
              title="Play"
              onAction={async () => {
                await play();
                await closeMainWindow();
                await popToRoot();
              }}
            />
          )}
          <Action
            icon={Icon.Forward}
            title={"Next Track"}
            shortcut={{ modifiers: ["cmd"], key: "." }}
            onAction={async () => {
              await skipToNext();
              await closeMainWindow();
              await popToRoot();
            }}
          />
          <Action
            icon={Icon.Rewind}
            title={"Previous Track"}
            shortcut={{ modifiers: ["cmd"], key: "," }}
            onAction={async () => {
              await skipToPrevious();
              await closeMainWindow();
              await popToRoot();
            }}
          />
          <Action
            title="Start Radio"
            icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
            onAction={async () => {
              await startPlaySimilar([trackId], [artistId]);
              showHUD(`Playing Radio`);
            }}
          />
          <Action
            icon={Icon.Heart}
            title="Like"
            onAction={async () => {
              await addToSavedTracks([trackId]);
              showHUD(`Added to your Liked Songs`);
            }}
          />
          <Action
            icon={Icon.HeartDisabled}
            title="Dislike"
            onAction={async () => {
              await removeFromSavedTracks([trackId]);
              showHUD(`Removed from your Liked Songs`);
            }}
          />
          <Action
            key={trackId}
            icon={"icon.png"}
            title={`Open in Spotify`}
            onAction={() => (installed ? open(`spotify:track:${trackId}`) : open(external_urls.spotify))}
          />
          <Action
            title="Copy Song URL"
            icon={Icon.Link}
            onAction={async () => {
              const url = `https://open.spotify.com/track/${trackId}`;
              await Clipboard.copy({
                html: `<a href=${url}>${trackName} by ${artistName}</a>`,
                text: url,
              });
              showHUD(`Copied URL to clipboard`);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default () => (
  <SpotifyProvider>
    <NowPlaying />
  </SpotifyProvider>
);
