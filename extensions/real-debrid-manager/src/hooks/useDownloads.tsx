import { useFetch } from "@raycast/utils";
import { GET_DOWNLOADS, requestDownloadDelete } from "../api";
import useToken from "./useToken";
import { DownloadsData } from "../schema";

export const useDownloads = () => {
  const token = useToken();

  const getDownloads = () => {
    return useFetch<DownloadsData>(GET_DOWNLOADS, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
  };

  const deleteDownload = (download_id: string) => {
    return requestDownloadDelete(download_id, token);
  };

  return { getDownloads, deleteDownload };
};

export default useDownloads;
