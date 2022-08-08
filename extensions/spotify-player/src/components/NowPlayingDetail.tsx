import { Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { SpotifyPlayingState, SpotifyState, TrackInfo } from "../spotify/types";
import { msToHMS } from "../utils";

export default function NowPlayingDetail({
  trackInfo,
  playerState,
}: {
  trackInfo: TrackInfo;
  playerState: SpotifyState;
}): JSX.Element {
  const [position, setPosition] = useState(playerState.position * 1000);
  const trackDuration = trackInfo.duration;

  useEffect(() => {
    setPosition(playerState.position * 1000);
  }, [playerState.position]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (playerState.state === SpotifyPlayingState.Playing && position < trackDuration) {
        setPosition(position + 1000);
      }
    }, 1000);

    return () => {
      clearTimeout(id);
    };
  }, [position]);

  return (
    <List.Item.Detail
      markdown={`<img src="${trackInfo.artwork_url}" alt="${trackInfo.album}]" width="160" height="160" />`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Track"
            text={trackInfo.name}
            icon={playerState.state == SpotifyPlayingState.Playing ? Icon.Play : Icon.Pause}
          />
          <List.Item.Detail.Metadata.Label title="Artist" text={trackInfo.artist} />
          <List.Item.Detail.Metadata.Label title="Album" text={trackInfo.album} />
          <List.Item.Detail.Metadata.Label title="Duration" text={`${msToHMS(position)} | ${msToHMS(trackDuration)}`} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
