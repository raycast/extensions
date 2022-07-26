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
import { currentPlayingTrack, likeCurrentlyPlayingTrack, startPlaySimilar } from "./client/client";
import { CurrentlyPlayingTrack } from "./client/interfaces";
import { isSpotifyInstalled, spotifyPlayingState, SpotifyPlayingState } from "./client/utils";
import { nextTrack, pause, play, previousTrack } from "./controls/spotify-applescript";

export default function Main() {
  const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState<CurrentlyPlayingTrack | undefined>();
  const [spotifyInstalled, setSpotifyInstalled] = useState<boolean | undefined>();
  const [currentSpotifyPlayingState, setCurrentSpotifyPlayingState] = useState<SpotifyPlayingState>(
    SpotifyPlayingState.Stopped
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function updatePlayingTrack() {
      setSpotifyInstalled(await isSpotifyInstalled());
      setCurrentSpotifyPlayingState(await spotifyPlayingState());
      const response = await currentPlayingTrack();
      if (response?.result) {
        setCurrentlyPlayingTrack(response?.result);
        const title = `${response?.result.artist} – ${response?.result.name}`;
        await updateCommandMetadata({ subtitle: `${title}` });
      } else if (response?.error) {
        await updateCommandMetadata({ subtitle: undefined });
        if (environment.launchType != LaunchType.Background) {
          showToast(Toast.Style.Failure, response.error);
        }
      }
      setIsLoading(false);
    }
    updatePlayingTrack();
  }, []);

  if (currentSpotifyPlayingState == SpotifyPlayingState.Stopped) {
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
            icon={currentSpotifyPlayingState == SpotifyPlayingState.Playing ? Icon.Pause : Icon.Play}
            title={currentSpotifyPlayingState == SpotifyPlayingState.Playing ? "Pause" : "Play"}
            onAction={() => (currentSpotifyPlayingState == SpotifyPlayingState.Playing ? pause() : play())}
          />
          <MenuBarExtra.Item icon={Icon.Forward} title={"Next Track"} onAction={() => nextTrack()} />
          <MenuBarExtra.Item icon={Icon.Rewind} title={"Previous Track"} onAction={() => previousTrack()} />
          <MenuBarExtra.Item
            title="Start Radio"
            icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
            onAction={async () => {
              if (currentlyPlayingTrack && currentlyPlayingTrack.id) {
                const trackId = currentlyPlayingTrack.id.replace("spotify:track:", "");
                await startPlaySimilar(trackId);
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
            key={currentlyPlayingTrack.id}
            icon={"icon.png"}
            title={`Open in Spotify`}
            onAction={() => open(`${currentlyPlayingTrack.id}`)}
          />
          <MenuBarExtra.Separator />
          {currentlyPlayingTrack && currentlyPlayingTrack.id && (
            <>
              <MenuBarExtra.Item
                title="Copy Song Link"
                icon={Icon.Link}
                onAction={async () => {
                  const trackId = currentlyPlayingTrack.id.replace("spotify:track:", "");
                  Clipboard.copy(`https://open.spotify.com/track/${trackId}`);
                  showHUD(`♫ Copied URL – ${trackTitle}`);
                }}
              />
            </>
          )}
        </>
      )}
    </MenuBarExtra>
  );
}
