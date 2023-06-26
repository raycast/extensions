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
import { useMe } from "./hooks/useMe";
import { formatTitle } from "./helpers/formatTitle";
import { getErrorMessage } from "./helpers/getError";

function NowPlayingMenuBarCommand({ launchType }: LaunchProps) {
  const preferences = getPreferenceValues<{
    maxTextLength?: boolean;
    showEllipsis?: boolean;
    iconType?: "spotify-icon" | "cover-image";
  }>();

  const { currentlyPlayingData, currentlyPlayingIsLoading, currentlyPlayingRevalidate } = useCurrentlyPlaying();

  // The hooks below will only execute when the Menu Bar is opened
  const { myDevicesData } = useMyDevices({ options: { execute: launchType === LaunchType.UserInitiated } });
  const { myPlaylistsData } = useMyPlaylists({ options: { execute: launchType === LaunchType.UserInitiated } });
  const { meData } = useMe({ options: { execute: launchType === LaunchType.UserInitiated } });
  const { containsMySavedTracksData, containsMySavedTracksRevalidate } = useContainsMyLikedTracks({
    trackIds: currentlyPlayingData?.item?.id ? [currentlyPlayingData?.item?.id] : [],
    options: { execute: launchType === LaunchType.UserInitiated },
  });

  const isPlaying = currentlyPlayingData?.is_playing === true;
  const trackAlreadyLiked = containsMySavedTracksData?.[0];
  const isTrack = currentlyPlayingData?.currently_playing_type !== "episode";

  const currentTime = Date.now();
  const tenMinutesInMilliseconds = 10 * 60 * 1000;
  const dataIsOld =
    currentlyPlayingData?.timestamp && currentTime - currentlyPlayingData.timestamp > tenMinutesInMilliseconds;

  if ((dataIsOld && !isPlaying) || !currentlyPlayingData?.item) {
    return <NothingPlaying isLoading={currentlyPlayingIsLoading || currentlyPlayingIsLoading} />;
  }

  const { item } = currentlyPlayingData;
  const { name, external_urls, uri } = item;

  let title = "";
  let coverImageUrl = "";
  let menuItems: JSX.Element | null = null;

  if (isTrack) {
    const { artists, id: trackId, album } = item as TrackObject;
    const artistName = artists?.[0]?.name;
    const artistId = artists?.[0]?.id;
    title = `${name} · ${artistName}`;
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
    title = `${name} · ${showName}`;
    coverImageUrl = show.images.slice(-1)[0]?.url || "";
  }

  return (
    <MenuBarExtra
      isLoading={currentlyPlayingIsLoading || currentlyPlayingIsLoading}
      icon={
        preferences.iconType === "cover-image" && coverImageUrl
          ? {
              source: coverImageUrl,
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
            try {
              await pause();
              await currentlyPlayingRevalidate();
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
              await currentlyPlayingRevalidate();
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
          ?.filter((playlist) => playlist.owner?.id === meData?.id || playlist.collaborative)
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
