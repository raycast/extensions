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
} from "@raycast/api";
import { useEffect, useState } from "react";
import { likeCurrentlyPlayingTrack, startPlaySimilar } from "./spotify/client";
import { SpotifyPlayingState, SpotifyState, TrackInfo } from "./spotify/types";
import { isSpotifyInstalled } from "./utils";
import { getState, getTrack, nextTrack, pause, play, previousTrack } from "./spotify/applescript";

export default function NowPlayingMenuBar() {
  const [spotifyInstalled, setSpotifyInstalled] = useState<boolean | undefined>();
  const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState<TrackInfo | undefined>();
  const [currentSpotifyState, setCurrentSpotifyState] = useState<SpotifyState | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlayerAndTrackState = async () => {
      // Check if Spotify is installed (only try this once)
      let isInstalled = spotifyInstalled;
      if (isInstalled == undefined) {
        isInstalled = await isSpotifyInstalled();
        setSpotifyInstalled(await isSpotifyInstalled());
      }

      // If Spotify is installed then fetch the player and track state
      if (isInstalled) {
        try {
          const [state, track] = await Promise.all([getState(), getTrack()]);

          setCurrentSpotifyState(state);
          setCurrentlyPlayingTrack(track);

          const title = `${track.artist} – ${track.name}`;
          await updateCommandMetadata({ subtitle: `${title}` });
        } catch (err) {
          await updateCommandMetadata({ subtitle: undefined });
          if (environment.launchType != LaunchType.Background) {
            showToast(Toast.Style.Failure, String(err));
          }
        }
      }

      setIsLoading(false);
    };

    fetchPlayerAndTrackState();
  }, []);

  const handlePlay = async () => {
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
    await setCurrentSpotifyState((oldState) => {
      if (!oldState) return;
      return {
        ...oldState,

        state: SpotifyPlayingState.Playing,
      };
    });
    await pause();
  };

  if (currentSpotifyState?.state == SpotifyPlayingState.Stopped) {
    return <MenuBarExtra isLoading={isLoading}></MenuBarExtra>;
  }

  const trackTitle =
    spotifyInstalled && currentlyPlayingTrack
      ? `${currentlyPlayingTrack.artist} – ${currentlyPlayingTrack.name}`
      : undefined;

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
      icon={spotifyInstalled && currentlyPlayingTrack ? "icon.png" : undefined}
      title={optimizeTitle(trackTitle)}
      tooltip={trackTitle}
      isLoading={isLoading}
    >
      {currentlyPlayingTrack && currentlyPlayingTrack.id && (
        <>
          <MenuBarExtra.Item
            icon={currentSpotifyState?.state == SpotifyPlayingState.Playing ? Icon.Pause : Icon.Play}
            title={currentSpotifyState?.state == SpotifyPlayingState.Playing ? "Pause" : "Play"}
            onAction={async () => {
              (await currentSpotifyState?.state) === SpotifyPlayingState.Playing ? handlePause() : handlePlay();
            }}
          />
          <MenuBarExtra.Item icon={Icon.Forward} title={"Next Track"} onAction={() => nextTrack()} />
          <MenuBarExtra.Item icon={Icon.Rewind} title={"Previous Track"} onAction={() => previousTrack()} />
          <MenuBarExtra.Item
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
          <MenuBarExtra.Item
            key={currentlyPlayingTrack?.id}
            icon={"icon.png"}
            title={`Open in Spotify`}
            onAction={() => open(`${currentlyPlayingTrack?.id}`)}
          />
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title="Copy Song Link"
            icon={Icon.Link}
            onAction={async () => {
              const trackId = currentlyPlayingTrack?.id.replace("spotify:track:", "");
              Clipboard.copy(`https://open.spotify.com/track/${trackId}`);
              showHUD(`♫ Copied URL – ${trackTitle}`);
            }}
          />
        </>
      )}
    </MenuBarExtra>
  );
}
