export type DriveCategory =
  "internal" | "removable" | "network" | "virtual" | "optical" | "unknown";

export type DriveTypeFilter =
  "all" | "internal" | "removable" | "network" | "virtual";

export type DriveHealthStatus = "Healthy" | "Warning" | "Critical" | "Unknown";

export type MediaType = "SSD" | "HDD" | "SCM" | "Unspecified" | "NetworkShare";

export interface StorageDrive {
  id: string;
  mountPoint: string;
  volumeName: string;
  displayName: string;
  driveLetter?: string;
  category: DriveCategory;
  driveTypeDescription: string;
  fileSystem: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number; // 0.0 - 100.0
  healthStatus: DriveHealthStatus;
  busType?: string;
  mediaType?: MediaType;
  model?: string;
  isReadOnly: boolean;
  isSystemDrive: boolean;
  isRemovable: boolean;
  isBitLockerEncrypted?: boolean;
  networkPath?: string;
  diskNumber?: number;
  partitionNumber?: number;
}

export interface StorageOverview {
  totalDrives: number;
  totalBytes: number;
  totalFreeBytes: number;
  totalUsedBytes: number;
  overallUsagePercent: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  primaryDrive?: StorageDrive;
}

export interface IStorageProvider {
  readonly platformName: string;
  getDrives(): Promise<StorageDrive[]>;
  getOverview(): Promise<StorageOverview>;
  ejectDrive?(drive: StorageDrive): Promise<boolean>;
}
