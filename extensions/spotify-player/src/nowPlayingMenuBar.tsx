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
import { dislikeCurrentlyPlayingTrack, likeCurrentlyPlayingTrack, startPlaySimilar } from "./spotify/client";
import { SpotifyPlayingState, SpotifyState, TrackInfo } from "./spotify/types";
import { getState, getTrack, nextTrack, pause, play, previousTrack, skipForward, rewindBackward } from "./spotify/applescript";
import { SpotifyProvider, useSpotify } from "./utils/context";

function NowPlayingMenuBar() {
  const { installed, authorized, loading: spotifyLoading } = useSpotify();
  const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState<TrackInfo | null>(null);
  const [currentSpotifyState, setCurrentSpotifyState] = useState<SpotifyState | null>(null);
  const [trackStateLoading, setTrackStateLoading] = useState(true);
  const isLoading = spotifyLoading || trackStateLoading;

  const fetchPlayerAndTrackState = async () => {
    let result: [SpotifyState | null, TrackInfo | null] = [null, null];

    if (!installed) {
      return;
    }

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

    setTrackStateLoading(false);
    return result;
  };

  useEffect(() => {
    fetchPlayerAndTrackState();
  }, [installed, spotifyLoading]);

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

  if (
    !isLoading &&
    (currentSpotifyState?.state == SpotifyPlayingState.Stopped || !installed || !currentlyPlayingTrack)
  ) {
    return null;
  }

  let trackTitle: string | undefined = undefined;
  if (currentlyPlayingTrack?.id.split(':')[1] === 'track') {
    currentlyPlayingTrack.isPodcast = false
    trackTitle = `${currentlyPlayingTrack.artist} - ${currentlyPlayingTrack.name}`
  } else if (currentlyPlayingTrack?.id.split(':')[1] === 'episode') {
    currentlyPlayingTrack.isPodcast = true
    trackTitle = `${currentlyPlayingTrack.name}`
  }
  console.log(trackTitle, "TRACKKK")
  const optimizeTitle = (title: string | undefined) => {
    if (title === undefined) {
      return title;
    }
    const prefs = getPreferenceValues();
    const max = Number(prefs.maxtitlelength);
    const showEllipsis = Boolean(prefs.showEllipsis);

    if (Number.isNaN(max) || max <= 0 || title.length <= max) {
      return title;
    }

    return title.substring(0, max).trim() + (showEllipsis ? "…" : "");
  };

  return (
    <MenuBarExtra
      icon={installed && currentlyPlayingTrack ? "icon.png" : undefined}
      title={optimizeTitle(trackTitle)}
      tooltip={trackTitle}
      isLoading={isLoading}
    >
      {!isLoading && (
        <>
          <MenuBarExtra.Item
            icon={currentSpotifyState?.state == SpotifyPlayingState.Playing ? Icon.Pause : Icon.Play}
            title={currentSpotifyState?.state == SpotifyPlayingState.Playing ? "Pause" : "Play"}
            onAction={async () => {
              (await currentSpotifyState?.state) === SpotifyPlayingState.Playing ? handlePause() : handlePlay();
            }}
          />
          <MenuBarExtra.Item
            icon={currentlyPlayingTrack?.isPodcast ? Icon.RotateClockwise : Icon.Forward}
            title={currentlyPlayingTrack?.isPodcast ? "Skip 15 sec" : "Next Track"}
            onAction={async () => {
              currentlyPlayingTrack?.isPodcast ? await skipForward(15) : await nextTrack();
              await fetchPlayerAndTrackState();
            }}
          />
          <MenuBarExtra.Item
            icon={currentlyPlayingTrack?.isPodcast ? Icon.RotateAntiClockwise : Icon.Rewind}
            title={currentlyPlayingTrack?.isPodcast ? "Rewind 15 sec" : "Previous Track"}
            onAction={async () => {
              currentlyPlayingTrack?.isPodcast ? await rewindBackward(15) : await previousTrack();
              await fetchPlayerAndTrackState();
            }}
          />
          {authorized && currentlyPlayingTrack && (
            <MenuBarExtra.Item
              title="Start Radio"
              icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
              onAction={async () => {
                const trackId = currentlyPlayingTrack.id.replace("spotify:track:", "");
                await startPlaySimilar({ seed_tracks: trackId });
                showHUD(`♫ Playing Similar - ♫ ${trackTitle}`);
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
                      const title = `${response.result.artist} - ${response.result.name}`;
                      showHUD(`💚 ${title}`);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
              />
              <MenuBarExtra.Item
                icon={Icon.HeartDisabled}
                title="Dislike"
                onAction={async () => {
                  try {
                    const response = await dislikeCurrentlyPlayingTrack();
                    if (response?.result) {
                      const title = `${response.result.artist} - ${response.result.name}`;
                      showHUD(`💔 ${title}`);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
              />
            </>
          )}
          {currentlyPlayingTrack && (
            <>
              <MenuBarExtra.Item
                key={currentlyPlayingTrack.id}
                icon={"icon.png"}
                title={`Open in Spotify`}
                onAction={() => open(`${currentlyPlayingTrack.id}`)}
              />
              {!currentlyPlayingTrack.isPodcast && (
                <>
                  <MenuBarExtra.Separator />

                  <MenuBarExtra.Item
                    title="Copy Song Link"
                    icon={Icon.Link}
                    onAction={async () => {
                      const trackId = currentlyPlayingTrack.id.replace("spotify:track:", "");
                      Clipboard.copy(`https://open.spotify.com/track/${trackId}`);
                      showHUD(`♫ Copied URL - ${trackTitle}`);
                    }}
                  />
                </>

              )}
            </>
          )}
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
      )
      }
    </MenuBarExtra >
  );
}

export default () => (
  <SpotifyProvider>
    <NowPlayingMenuBar />
  </SpotifyProvider>
);
