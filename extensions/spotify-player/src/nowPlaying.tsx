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
import { likeCurrentlyPlayingTrack, startPlaySimilar } from "./client/client";
import { CurrentlyPlayingTrack } from "./client/interfaces";
import { isSpotifyInstalled, spotifyPlayingState, SpotifyPlayingState } from "./client/utils";
import { currentPlayingTrack, nextTrack, pause, play, previousTrack } from "./controls/spotify-applescript";

interface State {
  isLoading: boolean;
  currentlyPlayingTrack?: CurrentlyPlayingTrack;
  spotifyInstalled?: boolean;
  playingState: SpotifyPlayingState;
}

export default function Main() {
  const [state, setState] = useState<State>({ isLoading: true, playingState: SpotifyPlayingState.Stopped });

  async function updatePlayingTrack() {
    const spotifyInstalled = await isSpotifyInstalled();
    const playingState = await spotifyPlayingState();
    setState((prevState) => ({ ...prevState, spotifyInstalled, playingState }));
    const response = await currentPlayingTrack();

    let newSubtitle: string | undefined;
    if (response?.result) {
      setState((prevState) => ({ ...prevState, currentlyPlayingTrack: response?.result }));
      newSubtitle = `${response?.result.artist} – ${response?.result.name}`;
    } else if (response?.error) {
      await updateCommandMetadata({ subtitle: undefined });
      if (environment.launchType != LaunchType.Background) {
        showToast(Toast.Style.Failure, response.error);
      }
    }

    await updateCommandMetadata({ subtitle: newSubtitle });
    setState((prevState) => ({ ...prevState, isLoading: false }));
  }

  useEffect(() => {
    updatePlayingTrack();
  }, []);

  if (state.isLoading) {
    return <MenuBarExtra isLoading={state.isLoading}></MenuBarExtra>;
  }

  if (state.playingState == SpotifyPlayingState.Stopped) {
    return null;
  }

  const trackTitle =
    state.spotifyInstalled && state.currentlyPlayingTrack
      ? `${state.currentlyPlayingTrack.artist} – ${state.currentlyPlayingTrack.name}`
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
      icon={state.spotifyInstalled && state.currentlyPlayingTrack ? "icon.png" : undefined}
      title={optimizeTitle(trackTitle)}
      tooltip={trackTitle}
      isLoading={state.isLoading}
    >
      {state.currentlyPlayingTrack && state.currentlyPlayingTrack.id && (
        <>
          <MenuBarExtra.Item
            icon={state.playingState == SpotifyPlayingState.Playing ? Icon.Pause : Icon.Play}
            title={state.playingState == SpotifyPlayingState.Playing ? "Pause" : "Play"}
            onAction={async () => {
              setState((prevState) => ({
                ...prevState,
                playingState:
                  prevState.playingState == SpotifyPlayingState.Playing
                    ? SpotifyPlayingState.Paused
                    : SpotifyPlayingState.Playing,
              }));
              await (state.playingState == SpotifyPlayingState.Playing ? pause() : play());
            }}
          />
          <MenuBarExtra.Item
            icon={Icon.Forward}
            title={"Next Track"}
            onAction={async () => {
              await nextTrack();
              await updatePlayingTrack();
            }}
          />
          <MenuBarExtra.Item
            icon={Icon.Rewind}
            title={"Previous Track"}
            onAction={async () => {
              await previousTrack();
              await updatePlayingTrack();
            }}
          />
          <MenuBarExtra.Item
            title="Start Radio"
            icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
            onAction={async () => {
              if (state.currentlyPlayingTrack && state.currentlyPlayingTrack.id) {
                const trackId = state.currentlyPlayingTrack.id.replace("spotify:track:", "");
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
            key={state.currentlyPlayingTrack.id}
            icon={"icon.png"}
            title={`Open in Spotify`}
            onAction={() => open(`${state.currentlyPlayingTrack?.id}`)}
          />
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title="Copy Song Link"
            icon={Icon.Link}
            onAction={async () => {
              const trackId = state.currentlyPlayingTrack?.id.replace("spotify:track:", "");
              Clipboard.copy(`https://open.spotify.com/track/${trackId}`);
              showHUD(`♫ Copied URL – ${trackTitle}`);
            }}
          />
        </>
      )}
    </MenuBarExtra>
  );
}
