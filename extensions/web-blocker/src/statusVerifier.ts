/**
 * Status Verifier - Ensures blocking status is always accurate
 * Checks the actual hosts file to verify if blocking is active
 */

import * as fs from "fs/promises";

const HOSTS_FILE_PATH = "/etc/hosts";
const WEBGLOCKER_TAG = "# WebBlocker";

/**
 * Verifies if blocking is actually active by checking the hosts file
 * @returns Promise resolving to true if any WebBlocker entries exist
 */
export async function verifyBlockingStatus(): Promise<boolean> {
  try {
    const hostsContent = await fs.readFile(HOSTS_FILE_PATH, "utf-8");

    // Check if any WebBlocker entries exist in hosts file
    const lines = hostsContent.split("\n");
    const hasBlockerEntries = lines.some(
      (line) =>
        line.includes(WEBGLOCKER_TAG) && line.trim().startsWith("127.0.0.1"),
    );

    return hasBlockerEntries;
  } catch (error) {
    console.error("Error verifying blocking status:", error);
    // If we can't read the file, assume blocking is inactive
    return false;
  }
}

/**
 * Gets count of blocked domains from hosts file
 * @returns Promise resolving to number of blocked domains
 */
export async function getActiveBlockedDomainsCount(): Promise<number> {
  try {
    const hostsContent = await fs.readFile(HOSTS_FILE_PATH, "utf-8");
    const lines = hostsContent.split("\n");

    const blockedDomains = lines.filter(
      (line) =>
        line.includes(WEBGLOCKER_TAG) && line.trim().startsWith("127.0.0.1"),
    );

    return blockedDomains.length;
  } catch (error) {
    console.error("Error getting blocked domains count:", error);
    return 0;
  }
}

/**
 * Synchronizes storage status with actual hosts file status
 * @returns Promise resolving to the actual blocking status
 */
export async function syncBlockingStatus(): Promise<boolean> {
  const actualStatus = await verifyBlockingStatus();

  // Import storage module dynamically to avoid circular dependencies
  const { setBlockingStatus } = await import("./storage");
  await setBlockingStatus(actualStatus);

  return actualStatus;
}
