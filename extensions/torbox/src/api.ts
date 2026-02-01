const BASE_URL = "https://api.torbox.app/v1/api";

export type DownloadType = "torrent" | "webdl" | "usenet";

const DOWNLOAD_TYPE_CONFIG: Record<DownloadType, { endpoint: string; idParam: string; controlEndpoint: string }> = {
  torrent: { endpoint: "torrents", idParam: "torrent_id", controlEndpoint: "controltorrent" },
  webdl: { endpoint: "webdl", idParam: "webdl_id", controlEndpoint: "controlwebdownload" },
  usenet: { endpoint: "usenet", idParam: "usenet_id", controlEndpoint: "controlusenetdownload" },
};

interface ApiResponse {
  success: boolean;
  detail?: string;
}

interface ListResponse<T> extends ApiResponse {
  data: T[];
}

interface DownloadLinkResponse extends ApiResponse {
  data: string;
}

async function request<T extends ApiResponse>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const json: T = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.detail || "Request failed");
  }

  return json;
}

export async function fetchDownloads<T>(apiKey: string, endpoint: string): Promise<T[]> {
  const json = await request<ListResponse<T>>(`${BASE_URL}/${endpoint}/mylist?bypass_cache=true`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return json.data || [];
}

export async function fetchQueuedDownloads<T>(apiKey: string): Promise<T[]> {
  const json = await request<ListResponse<T>>(`${BASE_URL}/queued/getqueued?bypass_cache=true`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return json.data || [];
}

export async function getDownloadLink(
  apiKey: string,
  type: DownloadType,
  downloadId: number,
  fileId?: number,
): Promise<string> {
  const { endpoint, idParam } = DOWNLOAD_TYPE_CONFIG[type];

  const params = new URLSearchParams({
    token: apiKey,
    [idParam]: downloadId.toString(),
  });

  if (fileId !== undefined) {
    params.append("file_id", fileId.toString());
  }

  const json = await request<DownloadLinkResponse>(`${BASE_URL}/${endpoint}/requestdl?${params}`);

  return json.data;
}

export async function deleteDownload(apiKey: string, type: DownloadType, downloadId: number): Promise<void> {
  const { endpoint, controlEndpoint, idParam } = DOWNLOAD_TYPE_CONFIG[type];

  await request<ApiResponse>(`${BASE_URL}/${endpoint}/${controlEndpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      [idParam]: downloadId,
      operation: "delete",
    }),
  });
}

export async function deleteQueuedDownload(apiKey: string, queuedId: number): Promise<void> {
  await request<ApiResponse>(`${BASE_URL}/queued/controlqueued`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queued_id: queuedId,
      operation: "delete",
    }),
  });
}
