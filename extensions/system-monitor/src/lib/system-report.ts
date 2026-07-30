import os from "node:os";
import { getHardwareInfo } from "./hardware-info";
import { getOSInfo } from "./os-version";
import { calculateDiskStorage, getDiskHealthInfo, getRootVolumeDetails } from "./disk-info";
import { getMemoryStats } from "./memory-stats";

export async function buildSystemReport(): Promise<string> {
  const [hardware, osInfo, storage, rootVolume, diskHealth, memory] = await Promise.all([
    getHardwareInfo(),
    getOSInfo(),
    calculateDiskStorage(),
    getRootVolumeDetails(),
    getDiskHealthInfo(),
    getMemoryStats(),
  ]);

  const storageLines = storage
    .map(
      (disk) =>
        `- ${disk.diskName}: ${disk.totalAvailableStorage} GB available of ${disk.totalSize} GB (${disk.usedStorage} GB used)`,
    )
    .join("\n");

  return [
    "System Report",
    "=============",
    "",
    "Hardware",
    `Hostname: ${os.hostname().replace(/\.(local|lan)$/, "")}`,
    `Model: ${hardware.modelName}`,
    `Model Year: ${hardware.modelYear}`,
    `Model Identifier: ${hardware.modelIdentifier}`,
    `Model Number: ${hardware.modelNumber}`,
    `Chip: ${hardware.chip}`,
    `CPU Cores: ${hardware.totalCores}`,
    `GPU: ${hardware.gpuChipset} (${hardware.gpuCores} cores)`,
    `GPU Memory: ${hardware.gpuMemory}`,
    `Memory: ${hardware.memory}`,
    `Serial Number: ${hardware.serialNumber}`,
    "",
    "Software",
    `macOS: ${osInfo.display}`,
    "",
    "Storage",
    `Device: ${diskHealth.deviceName}`,
    `Medium Type: ${diskHealth.mediumType}`,
    `SMART Status: ${diskHealth.smartStatus}`,
    `Disk Size: ${diskHealth.diskSize}`,
    `Root Volume: ${rootVolume.volumeName}`,
    `File System: ${rootVolume.fileSystem}`,
    `Media Type: ${rootVolume.mediaType}`,
    `Protocol: ${rootVolume.protocol}`,
    `Physical Store: ${rootVolume.physicalStore}`,
    storageLines,
    "",
    "Memory",
    `Total: ${Math.round(memory.memTotal / 1024)} GB`,
    `Used: ${Math.round(memory.memUsed / 1024)} GB`,
    `Wired: ${Math.round(memory.wired / 1024)} GB`,
    `Compressed: ${Math.round(memory.compressed / 1024)} GB`,
    `Swap Used: ${memory.swapUsed.toFixed(0)} MB`,
    `Pressure: ${memory.pressureLevel}`,
  ].join("\n");
}
