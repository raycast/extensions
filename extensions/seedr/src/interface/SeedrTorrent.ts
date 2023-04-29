export interface SeedrFile {
  id: number;
  path: string;
  size: number;
  last_update: string;
}

export type SeedrFolder = SeedrFile;

export interface SeedrTorrent {
  id: number;
  name: string;
  size: number;
  hash: string;
  download_rate: number;
  torrent_quality: number;
  connected_to: number;
  downloading_from: number;
  uploading_to: number;
  seeders: number;
  leechers: number;
  warnings: string;
  stopped: number;
  progress: number;
  progress_url: string;
  last_update: string;
}

export interface SeedrModelInterface {
  space_max: number;
  space_used: number;
  saw_walkthrough: number;
  id: number;
  timestamp: string;
  path: string;
  parent: number;
  folders: SeedrFolder[];
  files: SeedrFile[];
  torrents: SeedrTorrent[];
}
