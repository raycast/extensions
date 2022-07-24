import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Color,
  environment,
  Icon,
  LaunchType,
  List,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import BrowseAll from "./browseAll";
import { getState, getTrack, nextTrack, pause, play, playPause, previousTrack } from "./client/applescript";
import { likeCurrentlyPlayingTrack, startPlaySimilar } from "./client/client";
import { SpotifyPlayingState, SpotifyState, TrackInfo } from "./client/types";
import NotInstalledDetail from "./components/NotInstalledDetail";
import NowPlayingDetail from "./components/NowPlayingDetail";
import NowPlayingEmptyDetail from "./components/NowPlayingEmptyDetail";
import FeaturedPlaylists from "./featuredPlaylists";
import SearchAlbums from "./searchAlbums";
import SearchArtists from "./searchArtists";
import SearchPlaylists from "./searchPlaylists";
import SearchTracks from "./searchTracks";
import { isSpotifyInstalled, showTrackNotification } from "./utils";

export default function NowPlaying() {
  const [spotifyInstalled, setSpotifyInstalled] = useState<boolean | undefined>();
  const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState<TrackInfo | undefined>();
  const [currentSpotifyState, setCurrentSpotifyState] = useState<SpotifyState | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const { push } = useNavigation();

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
      } catch (err) {
        if (environment.launchType != LaunchType.Background) {
          showToast(Toast.Style.Failure, String(err));
        }
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    // Fetch initial data
    fetchPlayerAndTrackState();

    // Attempt to refresh the state every 5s
    const id = setInterval(() => {
      fetchPlayerAndTrackState();
    }, 5000);

    return () => {
      clearTimeout(id);
    };
  }, []);

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

        state: SpotifyPlayingState.Playing,
      };
    });
    await pause();
  };

  const handleNextTrack = async () => {
    await closeMainWindow();
    await nextTrack();
    await showTrackNotification();
    await fetchPlayerAndTrackState();
  };

  const handlePreviousTrack = async () => {
    await closeMainWindow();
    await previousTrack();
    await showTrackNotification();
    await fetchPlayerAndTrackState();
  };

  const searchItems = [
    <List.Item
      key="search-playlists"
      title="Search Playlists"
      icon={Icon.Music}
      actions={
        <ActionPanel>
          <Action title="Search Playlists" onAction={() => push(<SearchPlaylists />)} />
        </ActionPanel>
      }
    />,
    <List.Item
      key="search-tracks"
      title="Search Tracks"
      icon={Icon.MagnifyingGlass}
      actions={
        <ActionPanel>
          <Action title="Search Tracks" onAction={() => push(<SearchTracks />)} />
        </ActionPanel>
      }
    />,
    <List.Item
      key="search-artists"
      title="Search Artists"
      icon={Icon.Person}
      actions={
        <ActionPanel>
          <Action title="Search Artists" onAction={() => push(<SearchArtists />)} />
        </ActionPanel>
      }
    />,
    <List.Item
      key="search-albums"
      title="Search Albums"
      icon={Icon.List}
      actions={
        <ActionPanel>
          <Action title="Search Albums" onAction={() => push(<SearchAlbums />)} />
        </ActionPanel>
      }
    />,
    <List.Item
      key="featured-playlists"
      title="Featured Playlists"
      icon={Icon.Stars}
      actions={
        <ActionPanel>
          <Action title="Featured Playlists" onAction={() => push(<FeaturedPlaylists />)} />
        </ActionPanel>
      }
    />,
    <List.Item
      key="browse-all"
      title="Browse All"
      icon={Icon.Hashtag}
      actions={
        <ActionPanel>
          <Action title="Browse All" onAction={() => push(<BrowseAll />)} />
        </ActionPanel>
      }
    />,
  ];

  const NowPlayingActions = ({
    trackTitle,
    playerState,
    trackInfo,
  }: {
    trackTitle: string;
    playerState?: SpotifyState;
    trackInfo?: TrackInfo;
  }) => {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            icon={
              playerState
                ? playerState.state === SpotifyPlayingState.Playing
                  ? Icon.PauseFilled
                  : Icon.PlayFilled
                : Icon.Pause
            }
            title={playerState ? (playerState.state === SpotifyPlayingState.Playing ? "Pause" : "Play") : "Play/Pause"}
            onAction={() =>
              playerState
                ? playerState.state === SpotifyPlayingState.Playing
                  ? handlePause()
                  : handlePlay()
                : playPause()
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
          {trackInfo && (
            <Action
              title="Start Radio"
              icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
              onAction={async () => {
                if (trackInfo && trackInfo.id) {
                  const trackId = trackInfo.id.replace("spotify:track:", "");
                  await startPlaySimilar({ seed_tracks: trackId });
                  showHUD(`♫ Playing Similar – ♫ ${trackTitle}`);
                }
              }}
            />
          )}
        </ActionPanel.Section>

        {trackInfo && (
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
              key={trackInfo.id}
              icon={"icon.png"}
              title={`Open in Spotify`}
              onAction={() => open(`${trackInfo.id}`)}
            />
          </ActionPanel.Section>
        )}

        {trackInfo && (
          <ActionPanel.Section>
            <Action
              title="Copy Song Link"
              icon={Icon.Link}
              onAction={async () => {
                const trackId = trackInfo.id.replace("spotify:track:", "");
                Clipboard.copy(`https://open.spotify.com/track/${trackId}`);
                showHUD(`♫ Copied URL – ${trackTitle}`);
              }}
            />
          </ActionPanel.Section>
        )}
      </ActionPanel>
    );
  };

  const getListItems = () => {
    if (isLoading) {
      return [
        <List.Item
          key="loading"
          title="Loading"
          detail={<NowPlayingEmptyDetail text="Loading" />}
          actions={<NowPlayingActions trackTitle={"Loading"} />}
        />,
        ...searchItems,
      ];
    }

    if (!currentSpotifyState || currentSpotifyState?.state == SpotifyPlayingState.Stopped) {
      return [
        <List.Item
          key="not-playing"
          title="There is currently no track playing"
          detail={<NowPlayingEmptyDetail text="Not Playing" />}
          actions={<NowPlayingActions trackTitle={"Not Playing"} />}
        />,
        ...searchItems,
      ];
    }

    if (spotifyInstalled && currentlyPlayingTrack != null) {
      const trackTitle = `${currentlyPlayingTrack.artist} – ${currentlyPlayingTrack.name}`;
      return [
        <List.Item
          key="currently-playing"
          title={trackTitle}
          icon={currentSpotifyState.state === SpotifyPlayingState.Playing ? Icon.PlayFilled : Icon.PauseFilled}
          detail={<NowPlayingDetail trackInfo={currentlyPlayingTrack} playerState={currentSpotifyState} />}
          actions={
            <NowPlayingActions
              trackTitle={trackTitle}
              trackInfo={currentlyPlayingTrack}
              playerState={currentSpotifyState}
            />
          }
        />,
        ...searchItems,
      ];
    }
  };

  if (!isSpotifyInstalled) {
    return <NotInstalledDetail />;
  }

  const listItems = getListItems();

  return (
    <List searchBarPlaceholder="Now Playing..." isShowingDetail={true} enableFiltering isLoading={false}>
      {listItems}
    </List>
  );
}
