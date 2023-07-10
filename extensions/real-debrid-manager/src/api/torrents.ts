import fs from "fs";
import fetch from "node-fetch";
import { ADD_TORRENT_FILE, DELETE_TORRENT, GET_STATUS } from ".";
import { ErrorResponse } from "../schema";
export const requestTorrentDelete = async (torrent_id: string, token: string) => {
  const response = await fetch(DELETE_TORRENT(torrent_id), {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const { message, error } = (await response.json()) as ErrorResponse;
    throw new Error(`Something went wrong ${error || message || ""}`);
  }

  return response;
};

export const requestTorrentDetails = async (torrent_id: string, token: string) => {
  const response = await fetch(GET_STATUS(torrent_id), {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const { message, error } = (await response.json()) as ErrorResponse;
    throw new Error(`Something went wrong ${error || message || ""}`);
  }

  return response.json();
};

export const requestAddTorrentFile = async (file_path: string, token: string) => {
  const fileData = fs.readFileSync(file_path);

  const response = await fetch(ADD_TORRENT_FILE, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "Content-Type": "application/x-bittorrent",
    },
    body: fileData,
  });

  if (!response.ok) {
    const { message, error } = (await response.json()) as ErrorResponse;
    throw new Error(`Something went wrong ${error || message || ""}`);
  }

  return response.json();
};
