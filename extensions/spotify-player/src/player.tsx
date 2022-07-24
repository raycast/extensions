import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Color,
  environment,
  getPreferenceValues,
  Icon,
  LaunchType,
  List,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import BrowseAll from "./browseAll";
import { getState, getTrack, nextTrack, pause, play, playPause, previousTrack } from "./spotify/applescript";
import { likeCurrentlyPlayingTrack, startPlaySimilar, useSearch } from "./spotify/client";
import { SpotifyPlayingState, SpotifyState, TrackInfo } from "./spotify/types";
import NotInstalledDetail from "./components/NotInstalledDetail";
import NowPlayingDetail from "./components/NowPlayingDetail";
import NowPlayingEmptyDetail from "./components/NowPlayingEmptyDetail";
import { SearchListItems } from "./components/SearchListItems";
import FeaturedPlaylists from "./featuredPlaylists";
import SearchAlbums from "./searchAlbums";
import SearchArtists from "./searchArtists";
import SearchPlaylists from "./searchPlaylists";
import SearchTracks from "./searchTracks";
import { isSpotifyInstalled, Preferences, showTrackNotification } from "./utils";

export default function Player() {
  const preferences = getPreferenceValues<Preferences>();

  const [spotifyInstalled, setSpotifyInstalled] = useState<boolean | undefined>();
  const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState<TrackInfo | undefined>();
  const [currentSpotifyState, setCurrentSpotifyState] = useState<SpotifyState | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState<string>();

  const response = useSearch(searchText);

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

  const handlePlayPause = async () => {
    if (preferences.closeWindowOnAction) {
      await closeMainWindow();
    }
    await playPause();
  };

  const handlePlay = async () => {
    if (preferences.closeWindowOnAction) {
      await closeMainWindow();
    }
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
    if (preferences.closeWindowOnAction) {
      await closeMainWindow();
    }
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
    if (preferences.closeWindowOnAction) {
      await closeMainWindow();
    }
    await nextTrack();
    if (preferences.closeWindowOnAction) {
      await showTrackNotification();
    } else {
      await fetchPlayerAndTrackState();
    }
  };

  const handlePreviousTrack = async () => {
    if (preferences.closeWindowOnAction) {
      await closeMainWindow();
    }
    await previousTrack();
    if (preferences.closeWindowOnAction) {
      await showTrackNotification();
    } else {
      await fetchPlayerAndTrackState();
    }
  };

  const searchItems = [
    <List.Item
      key="search-playlists"
      title="Search Playlists"
      icon={Icon.Music}
      actions={
        <ActionPanel>
          <Action.Push title="Search Playlists" target={<SearchPlaylists />} />
        </ActionPanel>
      }
    />,
    <List.Item
      key="search-tracks"
      title="Search Tracks"
      icon={Icon.MagnifyingGlass}
      actions={
        <ActionPanel>
          <Action.Push title="Search Tracks" target={<SearchTracks />} />
        </ActionPanel>
      }
    />,
    <List.Item
      key="search-artists"
      title="Search Artists"
      icon={Icon.Person}
      actions={
        <ActionPanel>
          <Action.Push title="Search Artists" target={<SearchArtists />} />
        </ActionPanel>
      }
    />,
    <List.Item
      key="search-albums"
      title="Search Albums"
      icon={Icon.List}
      actions={
        <ActionPanel>
          <Action.Push title="Search Albums" target={<SearchAlbums />} />
        </ActionPanel>
      }
    />,
    <List.Item
      key="featured-playlists"
      title="Featured Playlists"
      icon={Icon.Stars}
      actions={
        <ActionPanel>
          <Action.Push title="Featured Playlists" target={<FeaturedPlaylists />} />
        </ActionPanel>
      }
    />,
    <List.Item
      key="browse-all"
      title="Browse All"
      icon={Icon.Hashtag}
      actions={
        <ActionPanel>
          <Action.Push title="Browse All" target={<BrowseAll />} />
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

  if (spotifyInstalled === false) {
    return <NotInstalledDetail />;
  }

  const listItems = getListItems() ?? [];

  return (
    <List
      searchBarPlaceholder="Now Playing..."
      isShowingDetail={true}
      isLoading={response.isLoading}
      onSearchTextChange={setSearchText}
    >
      {searchText
        ? response.result && <SearchListItems results={response.result} spotifyInstalled={spotifyInstalled ?? false} />
        : listItems}
    </List>
  );
}
