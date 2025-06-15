export enum TorrentStatus {
  Stopped = 0,
  QueuedToCheckFiles = 1,
  CheckingFiles = 2,
  QueuedToDownload = 3,
  Downloading = 4,
  QueuedToSeed = 5,
  Seeding = 6,
}

export enum SeedRatioMode {
  StopAtRatio = 1,
  Unlimited = 2,
}

export enum BandwidthPriority {
  High = 1,
  Normal = 0,
  Low = -1,
}

export type Torrent = {
  id: number;
  torrentFile: string;
  name: string;
  comment: string;
  eta: number;
  percentDone: number;
  metadataPercentComplete: number;
  status: TorrentStatus;
  errorString: string | null;
  rateDownload: number;
  rateUpload: number;
  files: { name: string; bytesCompleted: number; length: number }[];
  fileStats: { bytesCompleted: number; wanted: boolean; priority: number }[];
  pieces: string;
  pieceCount: number;
  pieceSize: number;
  hashString: string;
  creator: string;
  dateCreated: number;
  downloadDir: string;
  isPrivate: boolean;
  trackers: { announce: string; scrape: string; id: number; tier: number }[];
  bandwidthPriority: BandwidthPriority;
  downloadLimited: boolean;
  downloadLimit: number;
  uploadLimited: boolean;
  uploadLimit: number;
  seedRatioMode: SeedRatioMode;
  seedRatioLimit: number;
  wanted: number[];
  priorities: number[];
  trackerStats: {
    tier: number;
    host: string;
    announce: string;
    leecherCount: number;
    seederCount: number;
    lastScrapeTime: number;
    lastAnnounceTime: number;
    downloadCount: number;
  }[];
  addedDate: number;
};

export type SessionStats = {
  activeTorrentCount: number;
  downloadSpeed: number;
  uploadSpeed: number;
  pausedTorrentCount: number;
  torrentCount: number;
};
