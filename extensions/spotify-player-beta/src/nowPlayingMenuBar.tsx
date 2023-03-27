import { useEffect, useState } from "react";
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
import { containsMySavedTracks } from "./api/containsMySavedTrack";
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

function NowPlayingMenuBarCommand() {
  const { currentPlayingData, currentPlayingIsLoading, currentPlayingRevalidate } = useCurrentlyPlaying();
  const { myDevicesData } = useMyDevices();
  const { myPlaylistsData } = useMyPlaylists();
  const [isPaused, setIsPaused] = useState(currentPlayingData?.is_playing === false);
  const [trackAlreadyLiked, setTrackAlreadyLiked] = useState<boolean | null>(null);
  const preferences = getPreferenceValues();

  const isTrack = currentPlayingData?.currently_playing_type !== "episode";

  const getTrackAlreadyLiked = async (trackId: string) => {
    const songResponse = await containsMySavedTracks({ trackIds: [trackId] });
    setTrackAlreadyLiked(songResponse[0]);
  };

  useEffect(() => {
    setIsPaused(currentPlayingData?.is_playing === false);
    if (currentPlayingData?.item && isTrack) {
      getTrackAlreadyLiked(currentPlayingData?.item?.id || "");
    }
  }, [currentPlayingData]);

  if (!currentPlayingData || !currentPlayingData.item) {
    return <NothingPlaying isLoading={currentPlayingIsLoading} />;
  }

  const formatTitle = (title: string) => {
    const max = Number(preferences.maxTextLength);
    const showEllipsis = Boolean(preferences.showEllipsis);

    if (Number.isNaN(max) || max < 0 || title.length <= max) {
      return title;
    }

    return title.substring(0, max).trim() + (showEllipsis ? "…" : "");
  };

  const { item } = currentPlayingData;
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
            }}
          />
        )}
        <MenuBarExtra.Item
          icon={Icon.Forward}
          title="Next"
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          onAction={async () => {
            await skipToNext();
            await currentPlayingRevalidate();
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Rewind}
          title="Previous"
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          onAction={async () => {
            await skipToPrevious();
            currentPlayingRevalidate();
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
      isLoading={currentPlayingIsLoading}
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
          }}
        />
      )}
      {isPaused && (
        <MenuBarExtra.Item
          icon={Icon.Play}
          title="Play"
          onAction={async () => {
            await play();
          }}
        />
      )}
      {menuItems}
      <MenuBarExtra.Submenu icon={Icon.List} title="Add to Playlist">
        {myPlaylistsData?.items?.map((playlist) => {
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
              icon={device.is_active ? Icon.SpeakerOn : { source: Icon.SpeakerOff, tintColor: Color.SecondaryText }}
              onAction={async () => {
                if (device.id) {
                  await transferMyPlayback(device.id);
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
          icon="spotify-icon.png"
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
            icon="spotify-icon.png"
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
