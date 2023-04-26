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

export const exampleSeedrModel: SeedrModelInterface = {
  space_max: 4831838208,
  space_used: 2114397555,
  saw_walkthrough: 1,
  id: 186340390,
  timestamp: "2023-04-26 17:07:41",
  path: "",
  parent: -1,
  folders: [
    {
      id: 269164005,
      path: "The Super Mario Bros Movie (2023) 1080p HDTS x264 AAC - HushRips",
      size: 2114397555,
      last_update: "2023-04-26 17:07:41",
    },
  ],
  files: [],
  torrents: [
    {
      id: 92442397,
      name: "The Super Mario Bros Movie (2023) 1080p HDTS x264 AAC - HushRips",
      size: 2114397555,
      hash: "e95dac8d4f175e25a8550d639bc80d4fb399662c",
      download_rate: 0,
      torrent_quality: 2,
      connected_to: 15,
      downloading_from: 0,
      uploading_to: 11,
      seeders: 278,
      leechers: 692,
      warnings: "[]",
      stopped: 0,
      progress: 0,
      progress_url:
        "https://rs20.seedr.cc/subnode_actions.php?callback=?&action=torrent_progress&torrent_id=92442397&c=wBzjCKgE7Iz3Wa9yXL1dbQ&t=1682536044",
      last_update: "2023-04-26 17:07:24",
    },
  ],
};
