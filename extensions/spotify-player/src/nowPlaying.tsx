import {
  open,
  showToast,
  Toast,
  environment,
  LaunchType,
  showHUD,
  Clipboard,
  Icon,
  Color,
  Detail,
  closeMainWindow,
  Action,
  ActionPanel,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { likeCurrentlyPlayingTrack, startPlaySimilar } from "./spotify/client";
import { SpotifyPlayingState, SpotifyState, TrackInfo } from "./spotify/types";
import { showTrackNotification } from "./utils";
import { getState, getTrack, nextTrack, pause, play, playPause, previousTrack } from "./spotify/applescript";
import NowPlayingDetailMetadata from "./components/NowPlayingDetailMetadata";
import NowPlayingEmptyDetail from "./components/NowPlayingEmptyDetail";
import { SpotifyProvider, useSpotify } from "./utils/context";

function NowPlaying() {
  const { installed, authorized } = useSpotify();
  const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState<TrackInfo | null>(null);
  const [currentSpotifyState, setCurrentSpotifyState] = useState<SpotifyState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlayerAndTrackState = async () => {
    let result: [SpotifyState | null, TrackInfo | null] = [null, null];

    // Return early if we have not yet checked if Spotify is installed
    if (installed == null) result;

    // If Spotify is installed then fetch the player and track state
    if (installed) {
      try {
        const [state, track] = await Promise.all([getState(), getTrack()]);

        setCurrentSpotifyState(state);
        setCurrentlyPlayingTrack(track);

        result = [state, track];
      } catch (err) {
        if (environment.launchType != LaunchType.Background) {
          showToast(Toast.Style.Failure, String(err));
        }
      }
    }

    setIsLoading(false);
    return result;
  };

  useEffect(() => {
    fetchPlayerAndTrackState();
  }, [installed]);

  const handlePlayPause = async () => {
    await closeMainWindow();
    await playPause();
  };

  const handlePlay = async () => {
    await closeMainWindow();
    await setCurrentSpotifyState((oldState) => {
      if (!oldState) return null;
      return {
        ...oldState,

        state: SpotifyPlayingState.Playing,
      };
    });
    await play();
  };

  const handlePause = async () => {
    await closeMainWindow();
    await setCurrentSpotifyState((oldState) => {
      if (!oldState) return null;
      return {
        ...oldState,

        state: SpotifyPlayingState.Paused,
      };
    });
    await pause();
  };

  const handleNextTrack = async () => {
    await closeMainWindow();
    await nextTrack();
    const [state, track] = await fetchPlayerAndTrackState();
    await showTrackNotification(state, track);
  };

  const handlePreviousTrack = async () => {
    await closeMainWindow();
    await previousTrack();
    const [state, track] = await fetchPlayerAndTrackState();
    await showTrackNotification(state, track);
  };

  const trackTitle =
    installed && currentlyPlayingTrack ? `${currentlyPlayingTrack.artist} – ${currentlyPlayingTrack.name}` : undefined;

  if (currentSpotifyState?.state == SpotifyPlayingState.Stopped)
    return <NowPlayingEmptyDetail title="Not Playing" showLoadingImage={false} />;
  if (!currentlyPlayingTrack || !currentSpotifyState)
    return <NowPlayingEmptyDetail title="Loading" showLoadingImage={true} />;

  return (
    <Detail
      navigationTitle={trackTitle}
      isLoading={isLoading}
      metadata={<NowPlayingDetailMetadata trackInfo={currentlyPlayingTrack} playerState={currentSpotifyState} />}
      markdown={`# ${trackTitle}\n![${currentlyPlayingTrack.album}](${currentlyPlayingTrack.artwork_url}?raycast-width=275&raycast-height=275)`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              icon={
                currentSpotifyState
                  ? currentSpotifyState.state === SpotifyPlayingState.Playing
                    ? Icon.PauseFilled
                    : Icon.PlayFilled
                  : Icon.Pause
              }
              title={
                currentSpotifyState
                  ? currentSpotifyState.state === SpotifyPlayingState.Playing
                    ? "Pause"
                    : "Play"
                  : "Play/Pause"
              }
              onAction={() =>
                currentSpotifyState
                  ? currentSpotifyState.state === SpotifyPlayingState.Playing
                    ? handlePause()
                    : handlePlay()
                  : handlePlayPause()
              }
            />
            <Action
              icon={Icon.Forward}
              title={"Next Track"}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={() => handleNextTrack()}
            />
            <Action
              icon={Icon.Rewind}
              title={"Previous Track"}
              shortcut={{ modifiers: ["cmd"], key: "," }}
              onAction={() => handlePreviousTrack()}
            />
            {authorized && currentlyPlayingTrack && (
              <Action
                title="Start Radio"
                icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
                onAction={async () => {
                  if (currentlyPlayingTrack && currentlyPlayingTrack.id) {
                    const trackId = currentlyPlayingTrack.id.replace("spotify:track:", "");
                    await startPlaySimilar({ seed_tracks: trackId });
                    showHUD(`♫ Playing Similar – ♫ ${trackTitle}`);
                  }
                }}
              />
            )}
          </ActionPanel.Section>

          {currentlyPlayingTrack && (
            <ActionPanel.Section>
              {authorized && (
                <Action
                  icon={Icon.Heart}
                  title="Like"
                  onAction={async () => {
                    try {
                      const response = await likeCurrentlyPlayingTrack();
                      if (response?.result) {
                        const title = `${response.result.artist} – ${response.result.name}`;
                        showHUD(`💚 ${title}`);
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                />
              )}
              <Action
                key={currentlyPlayingTrack.id}
                icon={"icon.png"}
                title={`Open in Spotify`}
                onAction={() => open(`${currentlyPlayingTrack.id}`)}
              />
            </ActionPanel.Section>
          )}

          {currentlyPlayingTrack && (
            <ActionPanel.Section>
              <Action
                title="Copy Song Link"
                icon={Icon.Link}
                onAction={async () => {
                  const trackId = currentlyPlayingTrack.id.replace("spotify:track:", "");
                  Clipboard.copy(`https://open.spotify.com/track/${trackId}`);
                  showHUD(`♫ Copied URL – ${trackTitle}`);
                }}
              />
            </ActionPanel.Section>
          )}
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
