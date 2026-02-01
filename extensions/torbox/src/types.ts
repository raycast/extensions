export type DownloadType = "torrent" | "webdl" | "usenet";

export interface DownloadFile {
  id: number;
  name: string;
  size: number;
  short_name: string;
}

export interface Download {
  id: number;
  name: string;
  size: number;
  type: DownloadType;
  created_at: string;
  progress: number;
  download_finished: boolean;
  isQueued: boolean;
  files: DownloadFile[];
}
