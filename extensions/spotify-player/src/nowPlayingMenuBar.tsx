import { useEffect, useState } from "react";
import {
  open,
  showToast,
  Toast,
  showHUD,
  Clipboard,
  Icon,
  Color,
  Detail,
  closeMainWindow,
  Action,
  ActionPanel,
  popToRoot,
  List,
  MenuBarExtra,
} from "@raycast/api";
import {
  startPlaySimilar,
  useNowPlaying,
  pause,
  play,
  skipToNext,
  skipToPrevious,
  addToSavedTracks,
  removeFromSavedTracks,
  containsMySavedTracks,
  nowPlaying,
} from "./spotify/client";
import { SpotifyProvider, useSpotify } from "./utils/context";
import { isTrack, optimizeTitle } from "./utils";
import { Response } from "./spotify/interfaces";

function NowPlayingMenuBar() {
  const { installed, loading: spotifyLoading } = useSpotify();
  const response = useNowPlaying();
  console.log(response);
  // const [response, setResponse] = useState<Response<SpotifyApi.CurrentlyPlayingResponse>>({
  //   result: undefined,
  //   error: undefined,
  //   isLoading: true,
  // });
  const [isPaused, setIsPaused] = useState(true);
  const [songAlreadyLiked, setSongAlreadyLiked] = useState<boolean | null>(null);

  const trackAlreadyLiked = async (trackId: string) => {
    const songResponse = await containsMySavedTracks([trackId]);
    setSongAlreadyLiked(songResponse[0]);
  };

  // const getNowPlaying = async () => {
  //   console.log("start nowPlayingResponse");
  //   const nowPlayingResponse = await nowPlaying();
  //   console.log("nowPlayingResponse", nowPlayingResponse);
  //   setResponse(nowPlayingResponse);
  // };

  // useEffect(() => {
  //   console.log("mount", spotifyLoading);
  //   getNowPlaying();
  // }, [spotifyLoading]);

  // useEffect(() => {
  //   setIsPaused(response.result?.is_playing === false);
  //   if (response.result && Object.keys(response.result).length > 0 && isTrack(response.result)) {
  //     // trackAlreadyLiked(response.result.item.id);
  //   }
  // }, [response.result]);

  if (response.error) {
    return null;
  }

  if (response.isLoading) {
    return null;
  }

  const isIdle = response.result && Object.keys(response.result).length === 0;

  if (isIdle) {
    return null;
  }

  if (!response.result) {
    return null;
  }

  if (!isTrack(response.result)) {
    return null;
  }

  const { item } = response.result;
  const { name: trackName, album, artists, id: trackId, external_urls } = item;

  const albumName = album.name;
  const albumImage = album.images[0].url;
  const artistName = artists[0]?.name;
  const artistId = artists[0]?.id;

  return (
    <MenuBarExtra
      icon="icon.png"
      title={optimizeTitle(`${trackName} by ${artistName}`)}
      tooltip={`${trackName} by ${artistName}`}
      isLoading={spotifyLoading || response.isLoading}
    >
      <MenuBarExtra.Item
        title="Copy Song URL"
        icon={Icon.Link}
        onAction={async () => {
          const url = `https://open.spotify.com/track/${trackId}`;
          await Clipboard.copy({
            html: `<a href=${url}>${trackName} by ${artistName}</a>`,
            text: url,
          });
          showHUD(`Copied URL to clipboard`);
        }}
      />
    </MenuBarExtra>
  );
}

export default () => (
  <SpotifyProvider>
    <NowPlayingMenuBar />
  </SpotifyProvider>
);
