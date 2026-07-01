export type TransferProgress = {
  completedBytes: number;
  totalBytes: number;
  remainingBytes: number;
  fraction: number;
  bytesPerSecond?: number | null;
  etaSeconds?: number | null;
};

export type DomainHealth = {
  isActive?: boolean | null;
  needsAuth?: boolean | null;
  needsIndexing?: boolean | null;
  errorCount?: number | null;
  pendingIndexableCount?: number | null;
  totalIndexableCount?: number | null;
};

export type DomainSnapshot = {
  providerId: string;
  domainId: string;
  displayName: string;
  rootPath: string;
  observedAt: string;
  upload?: TransferProgress | null;
  download?: TransferProgress | null;
  health: DomainHealth;
  probeError?: string | null;
};

export type StatusReport = {
  observedAt: string;
  domains: DomainSnapshot[];
};
