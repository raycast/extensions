import { useEffect, useState } from "react";

import { Tracks } from "./tracks";
import { Track } from "./util/models";
import * as music from "./util/scripts";

export default function PlayTrack() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getTracks = async () => {
      setTracks(await music.track.getAllTracks());
      setIsLoading(false);
    };
    getTracks();
  }, []);

  return <Tracks tracks={tracks} isLoading={isLoading} dropdown={true} />;
}
