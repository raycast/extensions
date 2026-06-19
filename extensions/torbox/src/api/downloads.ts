import { DownloadType } from "../types";
import { BASE_URL, request, authHeaders } from "./client";
import {
  ApiResponse,
  ListResponse,
  DataResponse,
  TorrentData,
  WebDownloadData,
  UsenetData,
  QueuedDownloadData,
} from "./types";

const DOWNLOAD_TYPE_CONFIG: Record<DownloadType, { endpoint: string; idParam: string; controlEndpoint: string }> = {
  torrent: { endpoint: "torrents", idParam: "torrent_id", controlEndpoint: "controltorrent" },
  webdl: { endpoint: "webdl", idParam: "webdl_id", controlEndpoint: "controlwebdownload" },
  usenet: { endpoint: "usenet", idParam: "usenet_id", controlEndpoint: "controlusenetdownload" },
};

export const fetchTorrents = async (apiKey: string): Promise<TorrentData[]> => {
  const response = await request<ListResponse<TorrentData>>(`${BASE_URL}/torrents/mylist?bypass_cache=true`, {
    headers: authHeaders(apiKey),
  });
  return response.data || [];
};

export const fetchWebDownloads = async (apiKey: string): Promise<WebDownloadData[]> => {
  const response = await request<ListResponse<WebDownloadData>>(`${BASE_URL}/webdl/mylist?bypass_cache=true`, {
    headers: authHeaders(apiKey),
  });
  return response.data || [];
};

export const fetchUsenetDownloads = async (apiKey: string): Promise<UsenetData[]> => {
  const response = await request<ListResponse<UsenetData>>(`${BASE_URL}/usenet/mylist?bypass_cache=true`, {
    headers: authHeaders(apiKey),
  });
  return response.data || [];
};

export const fetchQueuedDownloads = async (apiKey: string): Promise<QueuedDownloadData[]> => {
  const response = await request<ListResponse<QueuedDownloadData>>(`${BASE_URL}/queued/getqueued?bypass_cache=true`, {
    headers: authHeaders(apiKey),
  });
  return response.data || [];
};

export const getDownloadLink = async (
  apiKey: string,
  type: DownloadType,
  downloadId: number,
  fileId?: number,
): Promise<string> => {
  const { endpoint, idParam } = DOWNLOAD_TYPE_CONFIG[type];

  const params = new URLSearchParams({
    token: apiKey,
    [idParam]: downloadId.toString(),
  });

  if (fileId !== undefined) {
    params.append("file_id", fileId.toString());
  }

  const response = await request<DataResponse<string>>(`${BASE_URL}/${endpoint}/requestdl?${params}`);
  return response.data;
};

export const deleteDownload = async (apiKey: string, type: DownloadType, downloadId: number): Promise<void> => {
  const { endpoint, controlEndpoint, idParam } = DOWNLOAD_TYPE_CONFIG[type];

  await request<ApiResponse>(`${BASE_URL}/${endpoint}/${controlEndpoint}`, {
    method: "POST",
    headers: {
      ...authHeaders(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      [idParam]: downloadId,
      operation: "delete",
    }),
  });
};

export const deleteQueuedDownload = async (apiKey: string, queuedId: number): Promise<void> => {
  await request<ApiResponse>(`${BASE_URL}/queued/controlqueued`, {
    method: "POST",
    headers: {
      ...authHeaders(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queued_id: queuedId,
      operation: "delete",
    }),
  });
};
