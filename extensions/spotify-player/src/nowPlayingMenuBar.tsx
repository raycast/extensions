import { useEffect, useState } from "react";
import { Icon, MenuBarExtra, Color, Clipboard, getPreferenceValues } from "@raycast/api";
import { useCurrentPlayingTrack } from "./hooks/useCurrentPlayingTrack";
import View from "./components/View";
import { containsMySavedTracks } from "./api/containsMySavedTrack";
import { pause } from "./api/pause";
import { play } from "./api/play";
import { skipToNext } from "./api/skipToNext";
import { skipToPrevious } from "./api/skipToPrevious";
import { startRadio } from "./api/startRadio";
import { removeFromMySavedTracks } from "./api/removeFromMySavedTracks";
import { addToMySavedTracks } from "./api/addToMySavedTracks";
import { isSpotifyInstalled } from "./helpers/isSpotifyInstalled";
import { isTrack } from "./helpers/track";

function NowPlayingMenuBarCommand() {
  const { currentPlayingData, currentPlayingError, currentPlayingIsLoading } = useCurrentPlayingTrack();
  const [isPaused, setIsPaused] = useState(currentPlayingData?.is_playing === false);
  const [songAlreadyLiked, setSongAlreadyLiked] = useState<boolean | null>(null);
  const preferences = getPreferenceValues();

  // console.log(currentPlayingData)

  const trackAlreadyLiked = async (trackId: string) => {
    const songResponse = await containsMySavedTracks({ trackIds: [trackId] });
    setSongAlreadyLiked(songResponse[0]);
  };

  if (currentPlayingError) {
    console.log("NowPlayingMenuBarCommand Error: ", currentPlayingError.message)
    return null;
  }

  useEffect(() => {
    setIsPaused(currentPlayingData?.is_playing === false);
    if (currentPlayingData && currentPlayingData.item && Object.keys(currentPlayingData).length > 0 && isTrack(currentPlayingData)) {
      trackAlreadyLiked(currentPlayingData.item.id);
    }
  }, [currentPlayingData]);

  const isIdle = currentPlayingData && Object.keys(currentPlayingData).length === 0;

  if (isIdle) {
    console.log("isIdle")
    return null;
  }

  if (!currentPlayingData || currentPlayingData.item === null) {
    console.log("!currentPlayingData")
    return null;
  }

  if (!isTrack(currentPlayingData)) {
    console.log("!isTrack(currentPlayingData)")
    return null;
  }


  const { item } = currentPlayingData;
  const { name: trackName, artists, id: trackId, external_urls } = item;

  const artistName = artists[0]?.name;
  const artistId = artists[0]?.id;

  const makeTitle = (title: string) => {

    const max = Number(preferences.maxTitleLength);
    const showEllipsis = Boolean(preferences.showEllipsis);

    if (Number.isNaN(max) || max <= 0 || title.length <= max) {
      return title;
    }

    return title.substring(0, max).trim() + (showEllipsis ? "…" : "");

  };

  const title = makeTitle(`${trackName} by ${artistName}`)

  return (
    <MenuBarExtra isLoading={currentPlayingIsLoading} icon="icon.png" title={title} tooltip={`${trackName} by ${artistName}`}>
      {!isPaused && (
        <MenuBarExtra.Item
          icon={Icon.PauseFilled}
          title="Pause"
          onAction={async () => {
            await pause();
          }}
        />
      )}
      {isPaused && (
        <MenuBarExtra.Item
          icon={Icon.PlayFilled}
          title="Play"
          onAction={async () => {
            await play();
          }}
        />
      )}
      <MenuBarExtra.Item
        icon={Icon.Forward}
        title={"Next Track"}
        shortcut={{ modifiers: ["cmd"], key: "." }}
        onAction={async () => {
          await skipToNext();
        }}
      />
      <MenuBarExtra.Item
        icon={Icon.Rewind}
        title={"Previous Track"}
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={async () => {
          await skipToPrevious();
        }}
      />
      <MenuBarExtra.Item
        title="Start Radio"
        icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
        onAction={async () => {
          await startRadio({ trackIds: [trackId], artistIds: [artistId] });
        }}
      />
      {songAlreadyLiked && (
        <MenuBarExtra.Item
          icon={Icon.HeartDisabled}
          title="Dislike"
          onAction={async () => {
            await removeFromMySavedTracks({ trackIds: [trackId] });
          }}
        />
      )}
      {!songAlreadyLiked && (
        <MenuBarExtra.Item
          icon={Icon.Heart}
          title="Like"
          onAction={async () => {
            await addToMySavedTracks({ trackIds: [trackId] });
          }}
        />
      )}
      <MenuBarExtra.Item
        title="Copy Song URL"
        icon={Icon.Link}
        onAction={async () => {
          const url = `https://open.spotify.com/track/${trackId}`;
          await Clipboard.copy({
            html: `<a href=${url}>${trackName} by ${artistName}</a>`,
            text: url,
          });
        }}
      />
      <MenuBarExtra.Item
        icon="icon.png"
        title="Open on Spotify"
        onAction={() => (isSpotifyInstalled ? open(`spotify:track:${trackId}`) : open(external_urls.spotify))}
      />
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
