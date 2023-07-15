import fs from "fs";
import {
  TORRENT_ADD_FILE,
  TORRENT_DELETE,
  TORRENT_GET_STATUS,
  TORRENT_ADD_MAGNET,
  TORRENT_SELECT_FILES,
  fetch,
  TORRENTS_GET,
} from ".";
import { ErrorResponse, TorrentItemData, TorrentItemDataExtended, UnrestrictTorrentResponse } from "../schema";
import { AxiosError, AxiosResponse } from "axios";
import { getPreferenceValues } from "@raycast/api";
import { formatErrorMessage } from "../utils";

export const requestTorrentDelete = async (torrent_id: string) => {
  const response: AxiosResponse<void> = await fetch.delete(TORRENT_DELETE(torrent_id));
  return response;
};

export const requestTorrents = async (): Promise<TorrentItemData[]> => {
  const { item_limit } = getPreferenceValues<Preferences>();
  const response = await fetch.get(TORRENTS_GET, {
    data: {
      limit: item_limit,
    },
  });
  return response.data;
};

export const requestTorrentDetails = async (torrent_id: string) => {
  try {
    const response: AxiosResponse<TorrentItemDataExtended> = await fetch.get(TORRENT_GET_STATUS(torrent_id));

    return response.data;
  } catch (e) {
    const axiosError = e as AxiosError<ErrorResponse>;
    const { message, error } = axiosError?.response?.data as ErrorResponse;
    throw new Error(formatErrorMessage(error || (message as string)));
  }
};

export const requestAddMagnet = async (magnet_link: string) => {
  const params = new URLSearchParams();
  params.append("magnet", magnet_link);

  try {
    const response: AxiosResponse<UnrestrictTorrentResponse> = await fetch.post(TORRENT_ADD_MAGNET, params.toString());

    return response.data;
  } catch (e) {
    const axiosError = e as AxiosError<ErrorResponse>;
    const { message, error } = axiosError?.response?.data as ErrorResponse;
    throw new Error(formatErrorMessage(error || (message as string)));
  }
};

export const requestAddTorrentFile = async (file_path: string) => {
  const file_data = fs.readFileSync(file_path);

  try {
    const response: AxiosResponse<UnrestrictTorrentResponse> = await fetch.put(TORRENT_ADD_FILE, file_data, {
      headers: {
        "Content-Type": "application/x-bittorrent",
      },
    });

    return response.data;
  } catch (e) {
    const axiosError = e as AxiosError<ErrorResponse>;
    const { message, error } = axiosError?.response?.data as ErrorResponse;
    throw new Error(formatErrorMessage(error || (message as string)));
  }
};

export const requestSelectTorrentFiles = async (torrent_id: string, selected_files?: string) => {
  const params = new URLSearchParams();
  params.append("files", selected_files || "all");

  try {
    const response: AxiosResponse<void> = await fetch.post(TORRENT_SELECT_FILES(torrent_id), params.toString());

    return response;
  } catch (e) {
    const axiosError = e as AxiosError<ErrorResponse>;
    const { message, error } = axiosError?.response?.data as ErrorResponse;
    throw new Error(formatErrorMessage(error || (message as string)));
  }
};
