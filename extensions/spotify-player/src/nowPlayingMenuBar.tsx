import {
  MenuBarExtra,
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
} from "@raycast/api";
import { useEffect, useState } from "react";
import { likeCurrentlyPlayingTrack, startPlaySimilar } from "./spotify/client";
import { SpotifyPlayingState, SpotifyState, TrackInfo } from "./spotify/types";
import { getState, getTrack, nextTrack, pause, play, previousTrack } from "./spotify/applescript";
import { SpotifyProvider, useSpotify } from "./utils/context";

function NowPlayingMenuBar() {
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

  const handlePlay = async () => {
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
    await setCurrentSpotifyState((oldState) => {
      if (!oldState) return null;
      return {
        ...oldState,

        state: SpotifyPlayingState.Playing,
      };
    });
    await pause();
  };

  if (isLoading) {
    return <MenuBarExtra isLoading={isLoading}></MenuBarExtra>;
  }

  if (currentSpotifyState?.state == SpotifyPlayingState.Stopped || !installed || !currentlyPlayingTrack) {
    return null;
  }

  const trackTitle = `${currentlyPlayingTrack.artist} – ${currentlyPlayingTrack.name}`;

  const optimizeTitle = (title: string | undefined) => {
    if (title === undefined) {
      return title;
    }
    const prefs = getPreferenceValues();
    const max = Number(prefs.maxtitlelength);
    if (Number.isNaN(max)) {
      return title;
    }
    if (max <= 0) {
      return title;
    }
    return title.slice(0, max);
  };

  return (
    <MenuBarExtra
      icon={installed && currentlyPlayingTrack ? "icon.png" : undefined}
      title={optimizeTitle(trackTitle)}
      tooltip={trackTitle}
      isLoading={isLoading}
    >
      <>
        <MenuBarExtra.Item
          icon={currentSpotifyState?.state == SpotifyPlayingState.Playing ? Icon.Pause : Icon.Play}
          title={currentSpotifyState?.state == SpotifyPlayingState.Playing ? "Pause" : "Play"}
          onAction={async () => {
            (await currentSpotifyState?.state) === SpotifyPlayingState.Playing ? handlePause() : handlePlay();
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Forward}
          title={"Next Track"}
          onAction={async () => {
            await nextTrack();
            await fetchPlayerAndTrackState();
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Rewind}
          title={"Previous Track"}
          onAction={async () => {
            await previousTrack();
            await fetchPlayerAndTrackState();
          }}
        />
        {authorized && (
          <MenuBarExtra.Item
            title="Start Radio"
            icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
            onAction={async () => {
              const trackId = currentlyPlayingTrack.id.replace("spotify:track:", "");
              await startPlaySimilar({ seed_tracks: trackId });
              showHUD(`♫ Playing Similar – ♫ ${trackTitle}`);
            }}
          />
        )}
        {authorized && (
          <>
            <MenuBarExtra.Separator />
            <MenuBarExtra.Item
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
          </>
        )}
        <MenuBarExtra.Item
          key={currentlyPlayingTrack.id}
          icon={"icon.png"}
          title={`Open in Spotify`}
          onAction={() => open(`${currentlyPlayingTrack.id}`)}
        />
        <MenuBarExtra.Separator />
        <MenuBarExtra.Item
          title="Copy Song Link"
          icon={Icon.Link}
          onAction={async () => {
            const trackId = currentlyPlayingTrack.id.replace("spotify:track:", "");
            Clipboard.copy(`https://open.spotify.com/track/${trackId}`);
            showHUD(`♫ Copied URL – ${trackTitle}`);
          }}
        />
        {!authorized && (
          <>
            <MenuBarExtra.Separator />
            <MenuBarExtra.Item
              icon={Icon.PersonCircle}
              title="Signed Out"
              tooltip="Open any Spotify view command and authorize to get more features here!"
            />
          </>
        )}
      </>
    </MenuBarExtra>
  );
}

export default () => (
  <SpotifyProvider>
    <NowPlayingMenuBar />
  </SpotifyProvider>
);
