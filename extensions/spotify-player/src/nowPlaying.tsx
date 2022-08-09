import {
  MenuBarExtra,
  updateCommandMetadata,
  open,
  showToast,
  Toast,
  environment,
  LaunchType,
  showHUD,
  Clipboard,
  Icon,
  Color,
  getPreferenceValues,
  Detail,
  closeMainWindow,
  Action,
  ActionPanel,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { likeCurrentlyPlayingTrack, startPlaySimilar } from "./spotify/client";
import { SpotifyPlayingState, SpotifyState, TrackInfo } from "./spotify/types";
import { isSpotifyInstalled, showTrackNotification } from "./utils";
import { getState, getTrack, nextTrack, pause, play, playPause, previousTrack } from "./spotify/applescript";
import { isAuthorized } from "./spotify/oauth";
import NowPlayingDetailMetadata from "./components/NowPlayingDetailMetadata";
import NowPlayingEmptyDetail from "./components/NowPlayingEmptyDetail";

export default function NowPlayingMenuBar() {
  const [spotifyInstalled, setSpotifyInstalled] = useState<boolean | undefined>();
  const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState<TrackInfo | undefined>();
  const [currentSpotifyState, setCurrentSpotifyState] = useState<SpotifyState | undefined>();
  const [authorized, setAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlayerAndTrackState = async () => {
    let result: [SpotifyState | null, TrackInfo | null] = [null, null];

    // Check if Spotify is installed (only try this once)
    let isInstalled = spotifyInstalled;
    if (isInstalled == undefined) {
      isInstalled = await isSpotifyInstalled();
      setSpotifyInstalled(await isSpotifyInstalled());
    }

    setAuthorized(await isAuthorized());

    // If Spotify is installed then fetch the player and track state
    if (isInstalled) {
      try {
        const [state, track] = await Promise.all([getState(), getTrack()]);

        setCurrentSpotifyState(state);
        setCurrentlyPlayingTrack(track);

        let newSubtitle: string | undefined;
        if (track.id) {
          newSubtitle = `${track.artist} – ${track.name}`;
        }
        await updateCommandMetadata({ subtitle: newSubtitle });
        result = [state, track];
      } catch (err) {
        await updateCommandMetadata({ subtitle: undefined });
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
  }, []);

  const handlePlayPause = async () => {
    await closeMainWindow();
    await playPause();
  };

  const handlePlay = async () => {
    await closeMainWindow();
    await setCurrentSpotifyState((oldState) => {
      if (!oldState) return;
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
      if (!oldState) return;
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

  if (currentSpotifyState?.state == SpotifyPlayingState.Stopped) {
    return <Detail isLoading={isLoading}></Detail>;
  }

  const trackTitle =
    spotifyInstalled && currentlyPlayingTrack
      ? `${currentlyPlayingTrack.artist} – ${currentlyPlayingTrack.name}`
      : undefined;

  if (!currentlyPlayingTrack || !currentSpotifyState) return <NowPlayingEmptyDetail text="Not Playing" />;

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
            {currentlyPlayingTrack && (
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
