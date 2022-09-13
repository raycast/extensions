import { useEffect, useState } from "react";

import { Tracks } from "./tracks";
import { playlistLayout } from "./util/list-or-grid";
import { Track } from "./util/models";
import { getPlaylistTracks } from "./util/scripts/playlists";

export const PlaylistTracks = (props: { id: string }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getTracks = async () => {
      setTracks(await getPlaylistTracks(props.id));
      setIsLoading(false);
    };
    getTracks();
    return () => {
      setTracks([]);
    };
  }, []);

  return <Tracks tracks={tracks} isLoading={isLoading} overrideLayout={playlistLayout} dropdown={true} />;
};
