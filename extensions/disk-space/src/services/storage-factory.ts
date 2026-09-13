import {
  IStorageProvider,
  StorageDrive,
  StorageOverview,
} from "../types/storage";
import { WindowsStorageProvider } from "./windows-provider";
import { MacOSStorageProvider } from "./macos-provider";
import { MockStorageProvider } from "./mock-provider";

export interface ProviderOptions {
  forceMock?: boolean;
  cacheTtlMs?: number;
}

export class CachedStorageProvider implements IStorageProvider {
  private baseProvider: IStorageProvider;
  private cachedDrives: StorageDrive[] | null = null;
  private cachedOverview: StorageOverview | null = null;
  private lastFetchTime = 0;
  private ttlMs: number;

  constructor(provider: IStorageProvider, ttlMs = 5000) {
    this.baseProvider = provider;
    this.ttlMs = ttlMs;
  }

  public get platformName(): string {
    return this.baseProvider.platformName;
  }

  public async getDrives(forceRefresh = false): Promise<StorageDrive[]> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.cachedDrives &&
      now - this.lastFetchTime < this.ttlMs
    ) {
      return this.cachedDrives;
    }

    const drives = await this.baseProvider.getDrives();
    this.cachedDrives = drives;
    this.lastFetchTime = now;
    this.cachedOverview = null; // Invalidate overview cache
    return drives;
  }

  public async getOverview(forceRefresh = false): Promise<StorageOverview> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.cachedOverview &&
      now - this.lastFetchTime < this.ttlMs
    ) {
      return this.cachedOverview;
    }

    const drives = await this.getDrives(forceRefresh);
    const overview = calculateOverview(drives);
    this.cachedOverview = overview;
    return overview;
  }

  public async ejectDrive(drive: StorageDrive): Promise<boolean> {
    if (!this.baseProvider.ejectDrive) {
      throw new Error(
        `Drive ejection is not supported by ${this.platformName} provider.`,
      );
    }

    const result = await this.baseProvider.ejectDrive(drive);
    if (result) {
      this.invalidateCache();
    }
    return result;
  }

  public invalidateCache(): void {
    this.cachedDrives = null;
    this.cachedOverview = null;
    this.lastFetchTime = 0;
  }
}

/**
 * Calculates a StorageOverview summary object from an array of StorageDrives.
 */
export function calculateOverview(drives: StorageDrive[]): StorageOverview {
  let totalBytes = 0;
  let totalFreeBytes = 0;
  let totalUsedBytes = 0;
  let healthyCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  for (const drive of drives) {
    totalBytes += drive.totalBytes;
    totalFreeBytes += drive.freeBytes;
    totalUsedBytes += drive.usedBytes;

    if (drive.healthStatus === "Healthy") {
      healthyCount++;
    } else if (drive.healthStatus === "Warning") {
      warningCount++;
    } else if (drive.healthStatus === "Critical") {
      criticalCount++;
    }
  }

  const overallUsagePercent =
    totalBytes > 0
      ? Math.round((totalUsedBytes / totalBytes) * 100 * 10) / 10
      : 0;

  const primaryDrive = drives.find((d) => d.isSystemDrive) || drives[0];

  return {
    totalDrives: drives.length,
    totalBytes,
    totalFreeBytes,
    totalUsedBytes,
    overallUsagePercent,
    healthyCount,
    warningCount,
    criticalCount,
    primaryDrive,
  };
}

let singletonCachedProvider: CachedStorageProvider | null = null;

/**
 * Factory function to retrieve or create the platform-appropriate storage provider.
 */
export function getStorageProvider(
  options?: ProviderOptions,
): IStorageProvider {
  if (options?.forceMock) {
    return new MockStorageProvider();
  }

  if (singletonCachedProvider) {
    return singletonCachedProvider;
  }

  let rawProvider: IStorageProvider;
  if (process.platform === "win32") {
    rawProvider = new WindowsStorageProvider();
  } else if (process.platform === "darwin") {
    rawProvider = new MacOSStorageProvider();
  } else {
    rawProvider = new MockStorageProvider();
  }

  const ttl = options?.cacheTtlMs ?? 5000;
  singletonCachedProvider = new CachedStorageProvider(rawProvider, ttl);
  return singletonCachedProvider;
}

/**
 * Resets the provider singleton instance (useful for testing or configuration changes).
 */
export function resetStorageProvider(): void {
  singletonCachedProvider = null;
}
