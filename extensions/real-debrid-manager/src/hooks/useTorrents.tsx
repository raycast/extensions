import { useFetch } from "@raycast/utils";
import { GET_TORRENTS, requestTorrentDelete, requestTorrentDetails } from "../api";
import useToken from "./useToken";
import { TorrentData } from "../schema";

export const useTorrents = () => {
  const token = useToken();

  const getTorrents = () => {
    return useFetch<TorrentData>(GET_TORRENTS, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
  };

  const getTorrentDetails = (id: string) => {
    return requestTorrentDetails(id, token);
  };

  const deleteTorrent = (torrent_id: string) => {
    return requestTorrentDelete(torrent_id, token);
  };

  return { getTorrents, deleteTorrent, getTorrentDetails };
};

export default useTorrents;
