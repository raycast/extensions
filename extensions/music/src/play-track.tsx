import { useEffect, useState } from "react";
import { getAllTracks } from "./util/scripts/track";
import { Tracks } from "./tracks";
import { Track } from "./util/models";

export default function PlayTrack() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getTracks = async () => {
      setTracks(await getAllTracks());
      setIsLoading(false);
    };
    getTracks();
  }, []);

  return <Tracks tracks={tracks} isLoading={isLoading} dropdown={true} />;
}
