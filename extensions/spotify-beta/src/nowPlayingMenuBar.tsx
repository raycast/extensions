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

function NowPlayingMenuBarCommand() {
  const preferences = getPreferenceValues<{ maxTextLength?: boolean; showEllipsis?: boolean }>();
  const { currentlyPlayingData, currentlyPlayingIsLoading, currentlyPlayingRevalidate } = useCurrentlyPlaying();
  const { playbackStateData, playbackStateIsLoading, playbackStateRevalidate } = usePlaybackState();
  const { myDevicesData } = useMyDevices();
  const { myPlaylistsData } = useMyPlaylists();
  const { meData } = useMe();
  const { containsMySavedTracksData, containsMySavedTracksRevalidate } = useContainsMyLikedTracks({
    trackIds: currentlyPlayingData?.item?.id ? [currentlyPlayingData?.item?.id] : [],
  });

  const trackAlreadyLiked = containsMySavedTracksData?.[0];
  const isPaused = !currentlyPlayingData?.is_playing || !playbackStateData?.is_playing;
  const isTrack = currentlyPlayingData?.currently_playing_type !== "episode";

  if (!currentlyPlayingData || !currentlyPlayingData.item) {
    return <NothingPlaying isLoading={currentlyPlayingIsLoading || playbackStateIsLoading} />;
  }

  const formatTitle = (title: string) => {
    const max = Number(preferences.maxTextLength);
    const showEllipsis = Boolean(preferences.showEllipsis);

    if (Number.isNaN(max) || max < 0 || title.length <= max) {
      return title;
    }

    return title.substring(0, max).trim() + (showEllipsis ? "…" : "");
  };

  const { item } = currentlyPlayingData;
  const { name, external_urls, uri } = item;

  let title = "";
  let menuItems: JSX.Element | null = null;

  if (isTrack) {
    const { artists, id: trackId } = item as TrackObject;
    const artistName = artists?.[0]?.name;
    const artistId = artists?.[0]?.id;
    title = `${name} · ${artistName}`;

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
      isLoading={currentlyPlayingIsLoading || playbackStateIsLoading}
      icon={{ source: { dark: "menu-icon-dark.svg", light: "menu-icon-light.svg" } }}
      title={formatTitle(title)}
      tooltip={title}
    >
      {!isPaused && (
        <MenuBarExtra.Item
          icon={Icon.Pause}
          title="Pause"
          onAction={async () => {
            await pause();
            await playbackStateRevalidate();
          }}
        />
      )}
      {isPaused && (
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
          {myDevicesData?.devices?.map((device) => (
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
                  await transferMyPlayback(device.id, isPaused ? false : true);
                }
                await showHUD(`Connected to ${device.name}`);
              }}
            />
          ))}
        </MenuBarExtra.Submenu>
      )}
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
    </MenuBarExtra>
  );
}

function NothingPlaying({ title = "Nothing is playing right now", isLoading }: { title?: string; isLoading: boolean }) {
  return (
    <MenuBarExtra icon={{ source: { dark: "menu-icon-dark.svg", light: "menu-icon-light.svg" } }} isLoading={isLoading}>
      <MenuBarExtra.Item title={title} />
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
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Open Spotify"
            icon="spotify-icon.svg"
            onAction={() => (isSpotifyInstalled ? open("spotify:") : open("https://play.spotify.com"))}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default function Command() {
  return (
    <View>
      <NowPlayingMenuBarCommand />
    </View>
  );
}
