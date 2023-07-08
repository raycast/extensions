import fetch from "node-fetch";

import { DELETE_DOWNLOAD } from ".";
import { ErrorResponse } from "../schema";

export const requestDownloadDelete = async (download_id: string, token: string) => {
  const response = await fetch(DELETE_DOWNLOAD(download_id), {
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
