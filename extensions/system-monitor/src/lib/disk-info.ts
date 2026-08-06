import { DiskInterface } from "../Interfaces";
import { execf } from "./exec";

export interface DiskVolumeDetails {
  volumeName: string;
  fileSystem: string;
  mediaType: string;
  protocol: string;
  physicalStore: string;
  containerFreeSpace: string;
  containerTotalSpace: string;
}

export interface DiskHealthInfo {
  deviceName: string;
  mediumType: string;
  smartStatus: string;
  diskSize: string;
}

function readField(output: string, label: string): string {
  return output.match(new RegExp(`^[ \\t]*${label}:[ \\t]*(.+)$`, "m"))?.[1]?.trim() ?? "Unknown";
}

export type DiskStorageEntry = DiskInterface & {
  /**
   * The volume lives on a different device than the boot volume — an external
   * drive or a secondary disk. Derived by comparing `df` device numbers, so
   * it needs no extra subprocess.
   */
  isExternal: boolean;
};

function deviceNumber(filesystem: string): number | null {
  const match = filesystem.match(/^\/dev\/disk(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** Parse `df -kP` output into the volume list. Exported for tests. */
export function parseDiskStorage(output: string): DiskStorageEntry[] {
  const rows = output
    .split("\n")
    .slice(1)
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      const mount = parts.slice(5).join(" ");
      const sizeKB = parseInt(parts[1], 10);
      const availKB = parseInt(parts[3], 10);
      return { device: parts[0], mount, sizeKB, availKB };
    })
    .filter((d) => d.mount === "/" || d.mount.startsWith("/Volumes"))
    // The mounted Recovery system volume shares the boot container, so its
    // size and free space duplicate the boot volume's — showing it reads as
    // the same disk counted twice.
    .filter((d) => d.mount !== "/Volumes/Recovery");

  const bootDevice = deviceNumber(rows.find((d) => d.mount === "/")?.device ?? "");

  return rows.map((d) => {
    const diskName = d.mount === "/" ? "Macintosh HD" : d.mount.split("/").pop();
    const totalSize = (d.sizeKB / 1024 / 1024).toFixed(2);
    const totalAvailableStorage = (d.availKB / 1024 / 1024).toFixed(2);
    const usedStorage = (+totalSize - +totalAvailableStorage).toFixed(2);
    const device = deviceNumber(d.device);
    const isExternal = bootDevice !== null && device !== null && device !== bootDevice;

    return { diskName, totalSize, totalAvailableStorage, usedStorage, isExternal } as DiskStorageEntry;
  });
}

export async function calculateDiskStorage(): Promise<DiskStorageEntry[]> {
  return parseDiskStorage(await execf("/bin/df", ["-kP"]));
}

export async function getRootVolumeDetails(): Promise<DiskVolumeDetails> {
  const output = await execf("/usr/sbin/diskutil", ["info", "/"]);

  return {
    volumeName: readField(output, "Volume Name"),
    fileSystem: readField(output, "File System Personality"),
    mediaType: readField(output, "Media Type"),
    protocol: readField(output, "Protocol"),
    physicalStore: readField(output, "APFS Physical Store"),
    containerFreeSpace: readField(output, "Container Free Space"),
    containerTotalSpace: readField(output, "Container Total Space"),
  };
}

export function physicalStoreDevice(physicalStore: string): string | null {
  const match = physicalStore.match(/(disk\d+)/i);
  return match?.[1] ?? null;
}

export async function getDiskHealthInfo(): Promise<DiskHealthInfo> {
  const rootVolume = await getRootVolumeDetails().catch(() => null);
  const deviceId = rootVolume ? physicalStoreDevice(rootVolume.physicalStore) : null;

  const [diskutilOutput, storageOutput] = await Promise.all([
    deviceId ? execf("/usr/sbin/diskutil", ["info", deviceId]).catch(() => "") : Promise.resolve(""),
    execf("/usr/sbin/system_profiler", ["SPStorageDataType"]).catch(() => ""),
  ]);

  const smartFromStorage =
    storageOutput.match(/S\.M\.A\.R\.T\. Status:\s*(.+)/i)?.[1]?.trim() ??
    storageOutput.match(/SMART Status:\s*(.+)/i)?.[1]?.trim();

  return {
    deviceName: readField(diskutilOutput, "Device / Media Name"),
    mediumType: storageOutput.match(/Medium Type:\s*(.+)/)?.[1]?.trim() ?? readField(diskutilOutput, "Media Type"),
    smartStatus: smartFromStorage ?? readField(diskutilOutput, "SMART Status"),
    diskSize: readField(diskutilOutput, "Disk Size"),
  };
}

export async function getDiskActivitySummary(): Promise<string | null> {
  const output = await execf("/usr/bin/top", ["-l", "1", "-s", "0", "-n", "0"]);
  const match = output.match(/Disks:\s+(.+)/);
  return match?.[1]?.trim() ?? null;
}
