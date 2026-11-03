export type DownloadStatus =
  "active" | "waiting" | "paused" | "complete" | "error" | "removed";

export type TaskKind = "direct" | "netdisk" | "magnet" | "torrent" | "bt";

export interface Aria2File {
  index?: string;
  path: string;
  length: string;
  completedLength: string;
  selected?: string;
  uris?: Array<{ uri: string; status?: string }>;
}

export interface Aria2Bittorrent {
  announceList?: string[][];
  comment?: string;
  creationDate?: number;
  mode?: string;
  info?: { name?: string };
}

export interface Aria2Task {
  gid: string;
  status: DownloadStatus;
  totalLength: string;
  completedLength: string;
  uploadLength: string;
  downloadSpeed: string;
  uploadSpeed: string;
  connections: string;
  numPieces?: string;
  pieceLength?: string;
  bitfield?: string;
  errorCode?: string;
  errorMessage?: string;
  dir: string;
  files: Aria2File[];
  bittorrent?: Aria2Bittorrent;
  followedBy?: string[];
  following?: string;
  verifiedLength?: string;
  verifyIntegrityPending?: string;
}

export interface GlobalStat {
  downloadSpeed: string;
  uploadSpeed: string;
  numActive: string;
  numWaiting: string;
  numStopped: string;
  numStoppedTotal?: string;
}

export interface Aria2Version {
  version: string;
  enabledFeatures: string[];
}

export interface Aria2Settings {
  rpcPort: number;
  downloadDir: string;
  connections: number;
  split: number;
  minSplitSize: string;
  maxConcurrentDownloads: number;
  fileAllocation: "none" | "prealloc";
  diskCache: string;
  maxOverallDownloadLimit: string;
  maxOverallUploadLimit: string;
  proxyMode: "system" | "direct" | "custom";
  allProxy: string;
  noProxy: string;
  checkCertificate: boolean;
  connectTimeout: number;
  timeout: number;
  maxTries: number;
  retryWait: number;
  lowestSpeedLimit: string;
  saveSessionInterval: number;
  notifications: boolean;
  autoStartOnAdd: boolean;
  autoStopWhenIdle: boolean;
  listenPort: number;
  dhtListenPort: number;
  enableDht: boolean;
  enablePeerExchange: boolean;
  btEnableLpd: boolean;
  btMaxPeers: number;
  btRequireCrypto: boolean;
  seedTime: number;
  seedRatio: number;
  btSaveMetadata: boolean;
  btLoadSavedMetadata: boolean;
  rpcSaveUploadMetadata: boolean;
  btTracker: string;
}

export const DEFAULT_SETTINGS: Aria2Settings = {
  rpcPort: 6800,
  downloadDir: `${process.env.USERPROFILE ?? "C:\\Users\\Jie"}\\Downloads`,
  connections: 16,
  split: 16,
  minSplitSize: "1M",
  maxConcurrentDownloads: 3,
  fileAllocation: "none",
  diskCache: "64M",
  maxOverallDownloadLimit: "0",
  maxOverallUploadLimit: "2M",
  proxyMode: "system",
  allProxy: "",
  noProxy: "",
  checkCertificate: true,
  connectTimeout: 30,
  timeout: 60,
  maxTries: 3,
  retryWait: 5,
  lowestSpeedLimit: "0",
  saveSessionInterval: 30,
  notifications: true,
  autoStartOnAdd: true,
  autoStopWhenIdle: true,
  listenPort: 6881,
  dhtListenPort: 6881,
  enableDht: true,
  enablePeerExchange: true,
  btEnableLpd: false,
  btMaxPeers: 55,
  btRequireCrypto: false,
  seedTime: 0,
  seedRatio: 1.0,
  btSaveMetadata: true,
  btLoadSavedMetadata: true,
  rpcSaveUploadMetadata: true,
  btTracker: "",
};

export interface InstallInfo {
  version: string;
  sha256: string;
  installPath: string;
  installedAt: string;
}

export interface ExtensionPreferences {
  rpcEndpoint: string;
  rpcSecret: string;
  refreshInterval: string;
  chunkViz: "heatmap" | "mosaic";
  chunkColumns: string;
  showStopped: boolean;
}

export interface RpcErrorShape {
  code?: number;
  message?: string;
}
