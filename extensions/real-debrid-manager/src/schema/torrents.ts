export type TorrentStatus =
  | "magnet_error"
  | "magnet_conversion"
  | "waiting_files_selection"
  | "queued"
  | "downloading"
  | "downloaded"
  | "error"
  | "virus"
  | "compressing"
  | "uploading"
  | "dead";

export type TorrentItemData = {
  id: string;
  filename: string;
  hash: string;
  bytes: number;
  host: string;
  split: number;
  progress: number;
  status: TorrentStatus;
  added: string;
  links: string[];
  ended?: string; // Only present when finished
  speed?: number; // Only present in "downloading", "compressing", "uploading" status
  seeders?: number; // Only present in "downloading", "magnet_conversion" status
};

export type TorrentFile = {
  id: number;
  path: string; // Path to the file inside the torrent, starting with "/"
  bytes: number;
  selected: 0 | 1;
};

export type TorrentItemDataExtended = TorrentItemData & {
  original_filename: string; // Original name of the torrent
  original_bytes: number; // Total size of the torrent
  files: TorrentFile[];
};

export type LinkType = "magnet" | "link";

export type ErrorResponse = {
  error?: string;
  message?: string;
  error_code?: number;
};

export type UnrestrictLinkResponse = {
  id: string;
  uri?: string;
  host?: string;
};

export type UnrestrictTorrentResponse = {
  id: string;
};
