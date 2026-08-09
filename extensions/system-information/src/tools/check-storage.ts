import si from "systeminformation";

interface StorageInfo {
  total: string;
  used: string;
  free: string;
  percentUsed: string;
  summary: string;
}

const formatStorage = (bytes: number) => `${(bytes / 1e9).toFixed(2)} GB`;

/**
 * Get storage information
 * @returns {Promise<StorageInfo>} Storage information including total, used, and free space
 */
export default async function Command(): Promise<StorageInfo> {
  try {
    let totalBytes: number;
    let usedBytes: number;
    let freeBytes: number;

    if (process.platform === "win32") {
      const fs = await si.fsSize();
      totalBytes = fs.reduce((sum, f) => sum + f.size, 0);
      freeBytes = fs.reduce((sum, f) => sum + f.available, 0);
      usedBytes = totalBytes - freeBytes;
    } else {
      const fs = await si.fsSize();
      const root = fs.find((f) => f.mount === "/") || fs[0];
      totalBytes = root.size;
      usedBytes = root.used;
      freeBytes = root.available;
    }

    const totalFormatted = formatStorage(totalBytes);
    const usedFormatted = formatStorage(usedBytes);
    const freeFormatted = formatStorage(freeBytes);
    const percentUsed = ((usedBytes / totalBytes) * 100).toFixed(2) + "%";

    return {
      total: totalFormatted,
      used: usedFormatted,
      free: freeFormatted,
      percentUsed: percentUsed,
      summary: `${usedFormatted} used of ${totalFormatted} (${freeFormatted} available)`,
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve storage information: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
