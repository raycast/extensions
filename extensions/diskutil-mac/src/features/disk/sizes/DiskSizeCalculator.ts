import type plist from "plist";
import type Disk from "../../../models/Disk";

export interface SizeInfo {
  sizeInt: number | null;
  sizeStr: string | null;
}

/**
 * Handles size calculations and formatting for disk space
 */
export class DiskSizeCalculator {
  constructor(private disk: Disk) {}

  /**
   * Converts bytes to human-readable format with suffix
   */
  static byteToSuffix(byte: number): string {
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    let i = 0;
    while (byte >= 1000 && i < units.length) {
      byte /= 1000;
      i++;
    }
    return `${byte.toFixed(2)} ${units[i]}`;
  }

  /**
   * Initialize all size properties based on disk details
   */
  initSizes(details: plist.PlistObject, mountStatus: string, fileSystem: string | null) {
    if (mountStatus === "Whole" || mountStatus === "Container") {
      this.disk.size.sizeInt = details.Size as number;
      this.disk.freeCapacity.sizeInt = details.FreeSpace as number;
    }

    if (fileSystem?.toUpperCase() === "APFS") {
      this.disk.freeCapacity.sizeInt = details.APFSContainerFree ? (details.APFSContainerFree as number) : null;
      this.disk.volumeSize.sizeInt = details.APFSContainerSize ? (details.APFSContainerSize as number) : null;
      this.disk.usedCapacity.sizeInt = details.CapacityInUse ? (details.CapacityInUse as number) : null;
    } else {
      this.disk.freeCapacity.sizeInt = details.FreeSpace != null ? (details.FreeSpace as number) : null;
      this.disk.volumeSize.sizeInt = details.VolumeSize != null ? (details.VolumeSize as number) : null;
      this.disk.usedCapacity.sizeInt =
        this.disk.volumeSize.sizeInt != null && this.disk.freeCapacity.sizeInt != null
          ? this.disk.volumeSize.sizeInt - this.disk.freeCapacity.sizeInt
          : null;
    }

    this.disk.size.sizeStr = this.disk.size.sizeInt
      ? DiskSizeCalculator.byteToSuffix(this.disk.size.sizeInt)
      : this.disk.size.sizeStr;
    this.disk.freeCapacity.sizeStr = this.disk.freeCapacity.sizeInt
      ? DiskSizeCalculator.byteToSuffix(this.disk.freeCapacity.sizeInt)
      : null;
    this.disk.volumeSize.sizeStr = this.disk.volumeSize.sizeInt
      ? DiskSizeCalculator.byteToSuffix(this.disk.volumeSize.sizeInt)
      : null;
    this.disk.usedCapacity.sizeStr = this.disk.usedCapacity.sizeInt
      ? DiskSizeCalculator.byteToSuffix(this.disk.usedCapacity.sizeInt)
      : null;
  }

  /**
   * Calculate percentage and prepare size display string
   */
  calculateSizeDisplay(type: "Full" | "Used" | "Free" | "UsedFree" = "Used"): {
    utilizedPercentage: number;
    usedPercentage: number;
    freePercentage: number;
    displayValue: string;
  } {
    const totalSize = (this.disk.freeCapacity.sizeInt ?? 0) + (this.disk.usedCapacity.sizeInt ?? 0);
    const physicalTotalSize = this.disk.volumeSize.sizeInt || 0;

    const utilizedPercentage =
      this.disk.usedCapacity.sizeInt && totalSize ? (this.disk.usedCapacity.sizeInt / totalSize) * 100 : 0;
    const usedPercentage =
      this.disk.usedCapacity.sizeInt && physicalTotalSize
        ? (this.disk.usedCapacity.sizeInt / physicalTotalSize) * 100
        : 0;
    const freePercentage =
      this.disk.freeCapacity.sizeInt && physicalTotalSize
        ? (this.disk.freeCapacity.sizeInt / physicalTotalSize) * 100
        : 0;

    const utilizedPercent = utilizedPercentage.toFixed(0);
    const usedPercent = usedPercentage.toFixed(2);
    const freePercent = freePercentage.toFixed(2);

    const totalSizeStr = this.disk.volumeSize.sizeStr || this.disk.size.sizeStr || "N/A";
    const usedStr = this.disk.usedCapacity.sizeStr || "N/A";
    const freeStr = this.disk.freeCapacity.sizeStr || "N/A";

    let displayValue: string;
    switch (type) {
      case "Full":
        displayValue = `${utilizedPercent}% ▲ ${usedStr} ▽ ${freeStr} ● ${totalSizeStr}`;
        break;
      case "Free":
        displayValue = `${freePercent}% ${freeStr} ▽`;
        break;
      case "Used":
        displayValue = `${usedPercent}% ${usedStr} ▲`;
        break;
      case "UsedFree":
        displayValue = `${utilizedPercent}% ▲ ${usedStr} ▽ ${freeStr}`;
        break;
      default:
        displayValue = `${utilizedPercent}% ▲ ${usedStr} ▽ ${freeStr}`;
        break;
    }

    return { utilizedPercentage, usedPercentage, freePercentage, displayValue };
  }
}
