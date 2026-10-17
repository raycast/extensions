export interface ApiResponse {
  success: boolean;
  detail?: string;
}

export interface ListResponse<T> extends ApiResponse {
  data: T[];
}

export interface DataResponse<T> extends ApiResponse {
  data: T;
}

export interface Hoster {
  id: number;
  name: string;
  domains: string[];
  status: boolean;
}

export interface TorrentData {
  id: number;
  hash: string;
  name: string;
  size: number;
  progress: number;
  download_state: string;
  download_speed: number;
  download_present: boolean;
  download_finished: boolean;
  files?: FileData[];
  created_at: string;
  updated_at: string;
}

export interface WebDownloadData {
  id: number;
  name: string;
  size: number;
  progress: number;
  download_state: string;
  download_present: boolean;
  download_finished: boolean;
  files?: FileData[];
  created_at: string;
  updated_at: string;
}

export interface UsenetData {
  id: number;
  name: string;
  size: number;
  progress: number;
  download_state: string;
  download_present: boolean;
  download_finished: boolean;
  files?: FileData[];
  created_at: string;
  updated_at: string;
}

export interface FileData {
  id: number;
  name: string;
  size: number;
  short_name: string;
}

export interface QueuedDownloadData {
  id: number;
  name: string;
  type: "torrent" | "webdl" | "usenet";
  created_at: string;
}

export interface CreateTorrentResult {
  torrent_id?: number;
  name?: string;
  hash?: string;
}

export interface CreateWebDownloadResult {
  webdownload_id?: number;
  name?: string;
  hash?: string;
}
