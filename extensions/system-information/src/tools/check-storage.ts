import { getStorageInfo } from "swift:../../swift";

interface StorageInfo {
  total: string;
  used: string;
  free: string;
  percentUsed: string;
  summary: string;
}

/**
 * Get storage information
 * @returns {Promise<StorageInfo>} Storage information including total, used, and free space
 */
export default async function Command(): Promise<StorageInfo> {
  try {
    const info = await getStorageInfo();
    const totalFormatted = info.total.toFixed(2) + " GB";
    const usedFormatted = info.used.toFixed(2) + " GB";
    const freeFormatted = info.free.toFixed(2) + " GB";
    const percentUsed = ((info.used / info.total) * 100).toFixed(2) + "%";

    return {
      total: totalFormatted,
      used: usedFormatted,
      free: freeFormatted,
      percentUsed: percentUsed,
      summary: `${usedFormatted} used of ${totalFormatted} (${freeFormatted} available)`,
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve storage information: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
