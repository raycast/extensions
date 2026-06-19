import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DISKUTIL = "/usr/sbin/diskutil";

export interface VolumeInfo {
  name: string;
  path: string; // Mount point, e.g. "/Volumes/EOS_DIGITAL"
}

/**
 * Detect removable volumes (SD cards, USB drives) including those connected
 * via built-in card readers. Uses `RemovableMediaOrExternalDevice` flag from
 * `diskutil info` which is true for both USB-external and internal-removable
 * media (e.g., built-in MacBook SD card reader). This flag is more reliable
 * than checking !Internal because built-in card readers set Internal=true even
 * for removable SD cards.
 *
 * Checks all partitions in parallel for fast detection.
 */
export async function getExternalVolumes(): Promise<VolumeInfo[]> {
  try {
    const { stdout: listOutput } = await execFileAsync(DISKUTIL, ["list", "-plist"]);

    // Extract all partition identifiers (disk0s1, disk2s1, etc.)
    const partRegex = /<string>(disk\d+s\d+)<\/string>/g;
    const partitions: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = partRegex.exec(listOutput)) !== null) {
      if (!partitions.includes(match[1])) {
        partitions.push(match[1]);
      }
    }

    // Check all partitions in parallel for speed
    const results = await Promise.allSettled(partitions.map((partId) => checkPartition(partId)));

    const volumes: VolumeInfo[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        if (!volumes.some((v) => v.path === result.value!.path)) {
          volumes.push(result.value);
        }
      }
    }

    return volumes;
  } catch {
    return [];
  }
}

async function checkPartition(partId: string): Promise<VolumeInfo | null> {
  try {
    const { stdout: infoOutput } = await execFileAsync(DISKUTIL, ["info", "-plist", partId]);

    const isRemovableOrExternal = /<key>RemovableMediaOrExternalDevice<\/key>\s*<true\/>/.test(infoOutput);
    const isVirtual = /<key>VirtualOrPhysical<\/key>\s*<string>Virtual<\/string>/.test(infoOutput);

    // Accept any physical removable/external volume. Using RemovableMediaOrExternalDevice
    // instead of !Internal fixes SD cards in built-in readers — macOS marks those as
    // Internal=true (reader is soldered in) but still sets RemovableMediaOrExternalDevice=true.
    if (!isRemovableOrExternal || isVirtual) return null;

    const mountMatch = infoOutput.match(/<key>MountPoint<\/key>\s*<string>(.*?)<\/string>/);
    if (!mountMatch?.[1]?.startsWith("/Volumes/")) return null;

    const mountPoint = mountMatch[1];
    const nameMatch = infoOutput.match(/<key>VolumeName<\/key>\s*<string>(.*?)<\/string>/);
    const name = nameMatch?.[1] || mountPoint.split("/").pop() || partId;

    return { name, path: mountPoint };
  } catch {
    return null;
  }
}
