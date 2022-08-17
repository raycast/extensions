import { Icon, Detail } from "@raycast/api";
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
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Track"
        text={trackInfo.name}
        icon={playerState.state == SpotifyPlayingState.Playing ? Icon.Play : Icon.Pause}
      />
      <Detail.Metadata.Label title="Artist" text={trackInfo.artist} />
      <Detail.Metadata.Label title="Album" text={trackInfo.album} />
      <Detail.Metadata.Label title="Duration" text={`${msToHMS(position)} | ${msToHMS(trackDuration)}`} />
    </Detail.Metadata>
  );
}
