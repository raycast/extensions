/** Repository object-store statistics used by the cleanup flow. */
export type RepositoryMaintenanceStats = {
  /** Number of pack files in the repository object database. */
  packCount: number;
  /** Disk space consumed by pack files, in KiB. */
  packedSizeKiB: number;
};

/** Repository state shown before the user confirms cleanup. */
export type RepositoryCleanupPreview = {
  repositoryPath: string;
  statistics: RepositoryMaintenanceStats;
};

/** Statistics captured before and after repository cleanup. */
export type RepositoryCleanupResult = {
  before: RepositoryMaintenanceStats;
  after: RepositoryMaintenanceStats;
};

const parseNonNegativeInteger = (fields: Map<string, string>, key: string) => {
  const value = fields.get(key);
  if (!value || !/^\d+$/.test(value)) {
    throw new Error(`Git field "${key}" must be a non-negative integer.`);
  }

  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue)) {
    throw new Error(`Git field "${key}" must be a non-negative integer.`);
  }
  return parsedValue;
};

/**
 * Parses machine-readable output from `git count-objects -v`.
 * @param output Standard output from Git.
 */
export const parseRepositoryMaintenanceStats = (output: string): RepositoryMaintenanceStats => {
  const fields = new Map<string, string>();
  for (const line of output.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) continue;
    fields.set(line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim());
  }

  return {
    packCount: parseNonNegativeInteger(fields, "packs"),
    packedSizeKiB: parseNonNegativeInteger(fields, "size-pack"),
  };
};

/** Formats a size reported by Git in KiB for display in Raycast. */
export const formatKibibytes = (sizeKiB: number) => {
  const units = ["KiB", "MiB", "GiB", "TiB", "PiB"];
  let value = sizeKiB;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} ${units[unitIndex]}`;
};

/** Formats before and after cleanup statistics for a success toast. */
export const formatRepositoryCleanupResult = ({ before, after }: RepositoryCleanupResult) => {
  const numberFormatter = new Intl.NumberFormat("en-US");
  const parts = [
    `Pack files: ${numberFormatter.format(before.packCount)} → ${numberFormatter.format(after.packCount)}`,
    `Packed size: ${formatKibibytes(before.packedSizeKiB)} → ${formatKibibytes(after.packedSizeKiB)}`,
  ];
  const reclaimedKiB = before.packedSizeKiB - after.packedSizeKiB;
  if (reclaimedKiB > 0) parts.push(`Reclaimed: ${formatKibibytes(reclaimedKiB)}`);
  return parts.join(" · ");
};
