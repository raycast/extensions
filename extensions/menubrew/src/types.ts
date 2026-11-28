export type PackageCategory =
  "Formulae (CLI)" | "Casks (Apps)" | "Casks (Auto-update / Greedy)";

export interface OutdatedPackage {
  id: string;
  name: string;
  installedVersion: string;
  latestVersion: string;
  category: PackageCategory;
  tap?: string;
  description?: string;
  homepage?: string;
  sizeBytes?: number;
  firstSeenAt: string;
  isOnlySinceLastUpgrade: boolean;
  totalSinceLastUpgrade: number;
  isGreedyOnly: boolean;
  isIgnored?: boolean;
}

export interface HomebrewStatus {
  version: string;
  isUpToDate: boolean | null;
  commitsBehind: number;
}

export interface BrewSnapshot {
  packages: OutdatedPackage[];
  homebrewStatus: HomebrewStatus;
  lastUpgradeAt?: string;
  newlyAdded: OutdatedPackage[];
  updatedAt: string;
}

export interface PersistedState {
  trackedUpdates: Record<string, { version: string; firstSeenAt: string }>;
  lastUpgradeAt?: string;
  updatesSeenSinceLastUpgrade: string[];
  ignoredIds?: string[];
  sizeCache?: Record<string, number>;
}
