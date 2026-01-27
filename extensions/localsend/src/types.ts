export interface DeviceInfo {
  alias: string;
  version: string;
  deviceModel?: string;
  deviceType?: "mobile" | "desktop" | "web" | "headless" | "server";
  fingerprint: string;
  port: number;
  protocol: "http" | "https";
  download?: boolean;
  announce?: boolean;
}

export interface LocalSendDevice extends DeviceInfo {
  ip: string;
  lastSeen: number;
  isFavorite?: boolean;
}

export interface FileMetadata {
  id: string;
  fileName: string;
  size: number;
  fileType: string;
  sha256?: string;
  preview?: string;
  metadata?: {
    modified?: string;
    accessed?: string;
  };
}

export interface PrepareUploadRequest {
  info: DeviceInfo;
  files: Record<string, FileMetadata>;
}

export interface PrepareUploadResponse {
  sessionId: string;
  files: Record<string, string>;
}

export interface PrepareDownloadResponse {
  info: DeviceInfo;
  sessionId: string;
  files: Record<string, FileMetadata>;
}

export interface FavoriteDevice {
  fingerprint: string;
  alias: string;
  ip?: string;
  addedAt: number;
}

export interface PendingTransfer {
  id: string;
  senderAlias: string;
  senderFingerprint?: string;
  files: Record<string, FileMetadata>;
  timestamp: number;
  status: "pending" | "accepted" | "rejected";
}
