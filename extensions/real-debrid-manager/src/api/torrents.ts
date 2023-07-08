import fetch from "node-fetch";
import { DELETE_TORRENT } from ".";
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
