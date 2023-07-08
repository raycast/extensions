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

export type TorrentData = TorrentItemData[];
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
