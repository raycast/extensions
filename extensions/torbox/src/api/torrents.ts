import fs from "fs";
import path from "path";
import { BASE_URL, request, authHeaders } from "./client";
import { DataResponse, CreateTorrentResult } from "./types";

export interface CreateTorrentOptions {
  magnet?: string;
  file?: string;
  name?: string;
  asQueued?: boolean;
  onlyIfCached?: boolean;
}

export const createTorrent = async (
  apiKey: string,
  options: CreateTorrentOptions,
): Promise<DataResponse<CreateTorrentResult>> => {
  const formData = new FormData();

  if (options.magnet) {
    formData.append("magnet", options.magnet);
  }

  if (options.file) {
    const fileBuffer = fs.readFileSync(options.file);
    const fileName = path.basename(options.file);
    formData.append("file", new Blob([new Uint8Array(fileBuffer)]), fileName);
  }

  if (options.name) {
    formData.append("name", options.name);
  }

  if (options.asQueued) {
    formData.append("as_queued", "true");
  }

  if (options.onlyIfCached) {
    formData.append("add_only_if_cached", "true");
  }

  return request<DataResponse<CreateTorrentResult>>(`${BASE_URL}/torrents/createtorrent`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: formData,
  });
};
