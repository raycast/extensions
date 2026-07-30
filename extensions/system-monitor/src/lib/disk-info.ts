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

export async function calculateDiskStorage() {
  const output = await execf("/bin/df", ["-kP"]);
  const lines = output.split("\n").slice(1);

  return lines
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      const mount = parts.slice(5).join(" ");
      const sizeKB = parseInt(parts[1], 10);
      const availKB = parseInt(parts[3], 10);
      return { mount, sizeKB, availKB };
    })
    .filter((d) => d.mount === "/" || d.mount.startsWith("/Volumes"))
    .map((d) => {
      const diskName = d.mount === "/" ? "Macintosh HD" : d.mount.split("/").pop();
      const totalSize = (d.sizeKB / 1024 / 1024).toFixed(2);
      const totalAvailableStorage = (d.availKB / 1024 / 1024).toFixed(2);
      const usedStorage = (+totalSize - +totalAvailableStorage).toFixed(2);

      return { diskName, totalSize, totalAvailableStorage, usedStorage } as DiskInterface;
    });
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
