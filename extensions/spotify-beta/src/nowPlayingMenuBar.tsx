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
import { usePlaybackState } from "./hooks/usePlaybackState";
import { useMe } from "./hooks/useMe";
import { useEffect, useRef } from "react";
import { useCachedState } from "@raycast/utils";
import { useCurrentlyPlayingUri } from "./hooks/useCurrentlyPlayingUri";
import { formatTitle } from "./helpers/formatTitle";

enum NowPlayingMenuBarIconType {
  Spotify = "spotify",
  Album = "album",
}

function NowPlayingMenuBarCommand({ launchType }: LaunchProps) {
  const preferences = getPreferenceValues<{
    maxTextLength?: boolean;
    showEllipsis?: boolean;
    iconType?: NowPlayingMenuBarIconType;
  }>();

  // First we get the currently playing URI using `useCurrentlyPlayingUri` (this prioritises AppleScript over the API)
  const { currentlyPlayingUriData, currentlyPlayingUriIsLoading } = useCurrentlyPlayingUri();
  // Then we store it in a state using `useCachedState` (this will persist the value between launches)
  const [currentUri, setCurrentUri] = useCachedState<string | undefined>(
    "currentlyPlayingUri",
    currentlyPlayingUriData
  );

  // We use a ref to store the value of `shouldExecute` so that it doesn't trigger a re-render
  const shouldExecute = useRef(false);

  // We conditionally set `shouldExecute` to true if the currently playing URI has changed
  const { currentlyPlayingData, currentlyPlayingIsLoading, currentlyPlayingRevalidate } = useCurrentlyPlaying({
    options: { execute: shouldExecute.current },
  });
  const { playbackStateData, playbackStateIsLoading, playbackStateRevalidate } = usePlaybackState({
    options: { execute: launchType === LaunchType.UserInitiated },
  });

  // The hooks below will only execute when the Menu Bar is opened
  const { myDevicesData } = useMyDevices({ options: { execute: launchType === LaunchType.UserInitiated } });
  const { myPlaylistsData } = useMyPlaylists({ options: { execute: launchType === LaunchType.UserInitiated } });
  const { meData } = useMe({ options: { execute: launchType === LaunchType.UserInitiated } });
  const { containsMySavedTracksData, containsMySavedTracksRevalidate } = useContainsMyLikedTracks({
    trackIds: currentlyPlayingData?.item?.id ? [currentlyPlayingData?.item?.id] : [],
    options: { execute: launchType === LaunchType.UserInitiated },
  });

  // We use `useEffect` to update the currently playing URI state when the currently playing URI changes
  useEffect(() => {
    if (!currentlyPlayingUriData) {
      setCurrentUri(undefined);
      shouldExecute.current = false;
      return;
    }
    if (currentlyPlayingUriData !== currentUri) {
      setCurrentUri(currentlyPlayingUriData);
      shouldExecute.current = true;
    }
  }, [currentUri, currentlyPlayingUriData]);

  const isPlaying = playbackStateData?.is_playing;
  const trackAlreadyLiked = containsMySavedTracksData?.[0];
  const isTrack = currentlyPlayingData?.currently_playing_type !== "episode";

  if (!currentUri || !currentlyPlayingData?.item) {
    return (
      <NothingPlaying isLoading={currentlyPlayingIsLoading || currentlyPlayingUriIsLoading || playbackStateIsLoading} />
    );
  }

  const { item } = currentlyPlayingData;
  const { name, external_urls, uri } = item;

  let title = "";
  let albumImageUrl = "";
  let menuItems: JSX.Element | null = null;

  if (isTrack) {
    const { artists, id: trackId, album } = item as TrackObject;
    const artistName = artists?.[0]?.name;
    const artistId = artists?.[0]?.id;
    title = `${name} · ${artistName}`;
    // Get the album image with the lowest resolution
    albumImageUrl = album?.images.slice(-1)[0]?.url || "";

    menuItems = (
      <>
        {trackAlreadyLiked && (
          <MenuBarExtra.Item
            icon={Icon.HeartDisabled}
            title="Dislike"
            onAction={async () => {
              await removeFromMySavedTracks({
                trackIds: trackId ? [trackId] : [],
              });
              await containsMySavedTracksRevalidate();
            }}
          />
        )}
        {!trackAlreadyLiked && (
          <MenuBarExtra.Item
            icon={Icon.Heart}
            title="Like"
            onAction={async () => {
              await addToMySavedTracks({
                trackIds: trackId ? [trackId] : [],
              });
              await containsMySavedTracksRevalidate();
            }}
          />
        )}
        <MenuBarExtra.Item
          icon={Icon.Forward}
          title="Next"
          onAction={async () => {
            await skipToNext();
            await currentlyPlayingRevalidate();
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Rewind}
          title="Previous"
          onAction={async () => {
            await skipToPrevious();
            await currentlyPlayingRevalidate();
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Music}
          title="Start Radio"
          onAction={async () => {
            await startRadio({
              trackIds: trackId ? [trackId] : [],
              artistIds: artistId ? [artistId] : [],
            });
          }}
        />
      </>
    );
  } else {
    const { show } = item as EpisodeObject;
    const showName = show.name;
    title = `${name} · ${showName}`;
  }

  return (
    <MenuBarExtra
      isLoading={currentlyPlayingIsLoading || currentlyPlayingUriIsLoading || playbackStateIsLoading}
      icon={
        preferences.iconType === NowPlayingMenuBarIconType.Album && albumImageUrl
          ? {
              source: albumImageUrl,
              mask: Image.Mask.RoundedRectangle,
            }
          : { source: { dark: "menu-icon-dark.svg", light: "menu-icon-light.svg" } }
      }
      title={formatTitle(title, Number(preferences.maxTextLength))}
      tooltip={title}
    >
      {isPlaying && (
        <MenuBarExtra.Item
          icon={Icon.Pause}
          title="Pause"
          onAction={async () => {
            await pause();
            await playbackStateRevalidate();
          }}
        />
      )}
      {!isPlaying && (
        <MenuBarExtra.Item
          icon={Icon.Play}
          title="Play"
          onAction={async () => {
            await play();
            await playbackStateRevalidate();
          }}
        />
      )}
      {menuItems}
      <MenuBarExtra.Submenu icon={Icon.List} title="Add to Playlist">
        {myPlaylistsData?.items
          ?.filter((playlist) => playlist.owner?.id === meData?.id || playlist.collaborative)
          .map((playlist) => {
            return (
              playlist.name &&
              playlist.id && (
                <MenuBarExtra.Item
                  key={playlist.id}
                  title={playlist.name}
                  onAction={async () => {
                    await addToPlaylist({
                      playlistId: playlist.id as string,
                      trackUris: [uri as string],
                    });
                    showHUD(`Added to ${playlist.name}`);
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
                    await transferMyPlayback(device.id, isPlaying ? true : false);
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

function NothingPlaying({ title = "Nothing is playing right now", isLoading }: { title?: string; isLoading: boolean }) {
  return (
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
