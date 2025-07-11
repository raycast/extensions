import React from "react";
import {
  Icon,
  MenuBarExtra,
  Clipboard,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  open,
  showHUD,
  Color,
  LaunchProps,
  openCommandPreferences,
  Image,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { pause } from "./api/pause";
import { play } from "./api/play";
import { skipToNext } from "./api/skipToNext";
import { skipToPrevious } from "./api/skipToPrevious";
import { startRadio } from "./api/startRadio";
import { removeFromMySavedTracks } from "./api/removeFromMySavedTracks";
import { addToMySavedTracks } from "./api/addToMySavedTracks";
import { transferMyPlayback } from "./api/transferMyPlayback";
import { useCurrentlyPlaying } from "./hooks/useCurrentlyPlaying";
import { useMyDevices } from "./hooks/useMyDevices";
import { isSpotifyInstalled } from "./helpers/isSpotifyInstalled";
import { View } from "./components/View";
import { EpisodeObject, TrackObject } from "./helpers/spotify.api";
import { useMyPlaylists } from "./hooks/useMyPlaylists";
import { addToPlaylist } from "./api/addToPlaylist";
import { useContainsMyLikedTracks } from "./hooks/useContainsMyLikedTracks";
import { useMe } from "./hooks/useMe";
import { formatTitle } from "./helpers/formatTitle";
import { getErrorMessage } from "./helpers/getError";

import { useSpotifyAppData } from "./hooks/useSpotifyAppData";
import { seek } from "./api/seek";

function NowPlayingMenuBarCommand({ launchType }: LaunchProps) {
  const { hideArtistName, maxTextLength, iconType, cleanupTitle } =
    getPreferenceValues<Preferences.NowPlayingMenuBar>();

  const [uriFromSpotify, setUriFromSpotify] = useCachedState<string | undefined>("currentlyPlayingUri", undefined);
  const shouldExecute = React.useRef<boolean>(false);

  const { spotifyAppData, spotifyAppDataIsLoading, spotifyAppDataRevalidate } = useSpotifyAppData();

  const { currentlyPlayingData, currentlyPlayingIsLoading, currentlyPlayingRevalidate } = useCurrentlyPlaying({
    options: { execute: shouldExecute.current },
  });

  // The hooks below will only execute when the Menu Bar is opened
  const { myDevicesData } = useMyDevices({ options: { execute: launchType === LaunchType.UserInitiated } });
  const { myPlaylistsData } = useMyPlaylists({ options: { execute: launchType === LaunchType.UserInitiated } });
  const { meData } = useMe({ options: { execute: launchType === LaunchType.UserInitiated } });
  const { containsMySavedTracksData, containsMySavedTracksRevalidate } = useContainsMyLikedTracks({
    trackIds: currentlyPlayingData?.item?.id ? [currentlyPlayingData?.item?.id] : [],
    options: { execute: launchType === LaunchType.UserInitiated },
  });

  React.useEffect(() => {
    if (spotifyAppData?.state === "NOT_RUNNING" || spotifyAppData?.state === "NOT_PLAYING") {
      setUriFromSpotify(undefined);
      shouldExecute.current = false;
      return;
    }

    if (uriFromSpotify !== spotifyAppData?.uri) {
      setUriFromSpotify(spotifyAppData?.uri);
      shouldExecute.current = true;
    }
  }, [uriFromSpotify, shouldExecute, spotifyAppData]);

  const isPlaying = spotifyAppData?.state === "PLAYING";
  const trackAlreadyLiked = containsMySavedTracksData?.[0];
  const isTrack = currentlyPlayingData?.currently_playing_type !== "episode";

  const currentTime = Date.now();
  const twoHoursInMilliseconds = 2 * 60 * 60 * 1000;
  const dataIsOld =
    currentlyPlayingData?.timestamp && currentTime - currentlyPlayingData.timestamp > twoHoursInMilliseconds;

  if (spotifyAppData?.state === "NOT_RUNNING") {
    return (
      <OpenSpotify isLoading={spotifyAppDataIsLoading || currentlyPlayingIsLoading || currentlyPlayingIsLoading} />
    );
  }

  if ((dataIsOld && !isPlaying) || !currentlyPlayingData?.item) {
    return (
      <NothingPlaying isLoading={spotifyAppDataIsLoading || currentlyPlayingIsLoading || currentlyPlayingIsLoading} />
    );
  }

  const { item } = currentlyPlayingData;
  const { name, external_urls, uri } = item;

  let title = "";
  let coverImageUrl = "";
  let menuItems: React.JSX.Element | null = null;

  if (isTrack) {
    const { artists, id: trackId, album } = item as TrackObject;
    const artistName = artists?.[0]?.name;
    const artistId = artists?.[0]?.id;
    title = formatTitle({ name, artistName, hideArtistName, maxTextLength, cleanupTitle });
    // Get the image with the lowest resolution
    coverImageUrl = album?.images.slice(-1)[0]?.url || "";

    menuItems = (
      <>
        {trackAlreadyLiked && (
          <MenuBarExtra.Item
            icon={Icon.HeartDisabled}
            title="Dislike"
            onAction={async () => {
              try {
                await removeFromMySavedTracks({
                  trackIds: trackId ? [trackId] : [],
                });
                await containsMySavedTracksRevalidate();
              } catch (err) {
                const error = getErrorMessage(err);
                showHUD(error);
              }
            }}
          />
        )}
        {!trackAlreadyLiked && (
          <MenuBarExtra.Item
            icon={Icon.Heart}
            title="Like"
            onAction={async () => {
              try {
                await addToMySavedTracks({
                  trackIds: trackId ? [trackId] : [],
                });
                await containsMySavedTracksRevalidate();
              } catch (err) {
                const error = getErrorMessage(err);
                showHUD(error);
              }
            }}
          />
        )}
        <MenuBarExtra.Item
          icon={Icon.Forward}
          title="Next"
          onAction={async () => {
            try {
              await skipToNext();
              await currentlyPlayingRevalidate();
            } catch (err) {
              const error = getErrorMessage(err);
              showHUD(error);
            }
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Rewind}
          title="Previous"
          onAction={async () => {
            try {
              await skipToPrevious();
              await currentlyPlayingRevalidate();
            } catch (err) {
              const error = getErrorMessage(err);
              showHUD(error);
            }
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Music}
          title="Start Radio"
          onAction={async () => {
            try {
              await startRadio({
                trackIds: trackId ? [trackId] : [],
                artistIds: artistId ? [artistId] : [],
              });
            } catch (err) {
              const error = getErrorMessage(err);
              showHUD(error);
            }
          }}
        />
      </>
    );
  } else {
    const { show } = item as EpisodeObject;
    const showName = show.name;
    title = formatTitle({ name, artistName: showName, hideArtistName, maxTextLength, cleanupTitle });
    coverImageUrl = show.images.slice(-1)[0]?.url || "";

    menuItems = (
      <>
        <MenuBarExtra.Item
          icon={Icon.RotateClockwise}
          title="Skip 15 seconds"
          onAction={async () => {
            try {
              const currentPositionSeconds = (currentlyPlayingData?.progress_ms || 0) / 1000;
              await seek(currentPositionSeconds + 15);
              await currentlyPlayingRevalidate();
            } catch (err) {
              const error = getErrorMessage(err);
              showHUD(error);
            }
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.RotateAntiClockwise}
          title="Back 15 seconds"
          onAction={async () => {
            try {
              const currentPositionSeconds = (currentlyPlayingData?.progress_ms || 0) / 1000;
              await seek(currentPositionSeconds - 15);
              await currentlyPlayingRevalidate();
            } catch (err) {
              const error = getErrorMessage(err);
              showHUD(error);
            }
          }}
        />
      </>
    );
  }

  return (
    <MenuBarExtra
      isLoading={spotifyAppDataIsLoading || currentlyPlayingIsLoading || currentlyPlayingIsLoading}
      icon={
        iconType === "cover-image" && coverImageUrl
          ? { source: coverImageUrl, mask: Image.Mask.RoundedRectangle }
          : { source: { dark: "menu-icon-dark.svg", light: "menu-icon-light.svg" } }
      }
      title={title}
      tooltip={title}
    >
      {isPlaying && (
        <MenuBarExtra.Item
          icon={Icon.Pause}
          title="Pause"
          onAction={async () => {
            try {
              await pause();
              await spotifyAppDataRevalidate();
            } catch (err) {
              const error = getErrorMessage(err);
              showHUD(error);
            }
          }}
        />
      )}
      {!isPlaying && (
        <MenuBarExtra.Item
          icon={Icon.Play}
          title="Play"
          onAction={async () => {
            try {
              await play();
              await spotifyAppDataRevalidate();
            } catch (err) {
              const error = getErrorMessage(err);
              showHUD(error);
            }
          }}
        />
      )}
      {menuItems}
      <MenuBarExtra.Submenu icon={Icon.List} title="Add to Playlist">
        {myPlaylistsData?.items
          ?.filter((playlist) => playlist.owner?.id === meData?.id)
          .map((playlist) => {
            return (
              playlist.name &&
              playlist.id && (
                <MenuBarExtra.Item
                  key={playlist.id}
                  title={playlist.name}
                  onAction={async () => {
                    try {
                      await addToPlaylist({
                        playlistId: playlist.id as string,
                        trackUris: [uri as string],
                      });
                      showHUD(`Added to ${playlist.name}`);
                    } catch (err) {
                      const error = getErrorMessage(err);
                      showHUD(error);
                    }
                  }}
                />
              )
            );
          })}
      </MenuBarExtra.Submenu>
      {myDevicesData?.devices && (
        <MenuBarExtra.Submenu icon={Icon.Mobile} title="Connect Device">
          {myDevicesData?.devices
            ?.filter((device) => !device.is_restricted)
            .map((device) => (
              <MenuBarExtra.Item
                key={device.id}
                title={device.name as string}
                icon={
                  device.is_active
                    ? { source: Icon.SpeakerOn, tintColor: Color.Green }
                    : { source: Icon.SpeakerOff, tintColor: Color.SecondaryText }
                }
                onAction={async () => {
                  if (device.id) {
                    try {
                      await transferMyPlayback(device.id, isPlaying ? true : false);
                    } catch (err) {
                      const error = getErrorMessage(err);
                      showHUD(error);
                    }
                  }
                  await showHUD(`Connected to ${device.name}`);
                }}
              />
            ))}
        </MenuBarExtra.Submenu>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.ArrowsExpand}
          title="Now Playing"
          onAction={() =>
            launchCommand({
              name: "nowPlaying",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Copy URL"
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={async () => {
            await Clipboard.copy({
              html: `<a href=${external_urls?.spotify}>${title}</a>`,
              text: external_urls?.spotify,
            });
            showHUD("Copied URL to clipboard");
          }}
        />
        <MenuBarExtra.Item
          icon="spotify-icon.svg"
          title="Open on Spotify"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() =>
            isSpotifyInstalled ? open(uri || "spotify") : open(external_urls?.spotify || "https://play.spotify.com")
          }
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function OpenSpotify({ isLoading }: { title?: string; isLoading: boolean }) {
  const preferences = getPreferenceValues<Preferences.NowPlayingMenuBar>();

  return preferences.hideIconWhenIdle ? null : (
    <MenuBarExtra icon={{ source: { dark: "menu-icon-dark.svg", light: "menu-icon-light.svg" } }} isLoading={isLoading}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Spotify needs to be opened" />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Spotify"
          icon="spotify-icon.svg"
          onAction={() => (isSpotifyInstalled ? open("spotify:") : open("https://play.spotify.com"))}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function NothingPlaying({ title = "Nothing is playing right now", isLoading }: { title?: string; isLoading: boolean }) {
  const preferences = getPreferenceValues<Preferences.NowPlayingMenuBar>();
  return preferences.hideIconWhenIdle ? null : (
    <MenuBarExtra icon={{ source: { dark: "menu-icon-dark.svg", light: "menu-icon-light.svg" } }} isLoading={isLoading}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={title} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Your library"
          icon={Icon.Book}
          onAction={() => launchCommand({ name: "yourLibrary", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Search"
          icon={Icon.MagnifyingGlass}
          onAction={() => launchCommand({ name: "search", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Spotify"
          icon="spotify-icon.svg"
          onAction={() => (isSpotifyInstalled ? open("spotify:") : open("https://play.spotify.com"))}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default function Command(props: LaunchProps) {
  return (
    <View>
      <NowPlayingMenuBarCommand {...props} />
    </View>
  );
}
