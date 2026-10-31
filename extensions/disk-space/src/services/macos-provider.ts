import { execFile } from "child_process";
import { promisify } from "util";
import {
  IStorageProvider,
  StorageDrive,
  StorageOverview,
} from "../types/storage";
import { RawDriveInput, sanitizeDrive } from "../utils/sanitizers";

const execFileAsync = promisify(execFile);

interface DfEntry {
  filesystem: string;
  totalKb: number;
  usedKb: number;
  freeKb: number;
  capacityPercent: number;
  mountPoint: string;
}

export class MacOSStorageProvider implements IStorageProvider {
  public readonly platformName = "macOS";

  public async getDrives(): Promise<StorageDrive[]> {
    if (process.platform !== "darwin") {
      // In development / non-macOS environment, return empty or mock
      return [];
    }

    try {
      const dfEntries = await this.parseDf();
      const drives: StorageDrive[] = [];

      for (const entry of dfEntries) {
        const diskInfo = await this.getDiskutilInfo(
          entry.mountPoint,
          entry.filesystem,
        );
        const isSystem =
          entry.mountPoint === "/" ||
          entry.mountPoint === "/System/Volumes/Data";

        const rawDrive: RawDriveInput = {
          id: `macos-${entry.filesystem.replace(/[^a-zA-Z0-9]/g, "_")}`,
          mountPoint: entry.mountPoint,
          volumeName:
            diskInfo.volumeName ||
            (isSystem
              ? "Macintosh HD"
              : entry.mountPoint.split("/").pop() || "Volume"),
          category: diskInfo.category,
          driveTypeDescription: diskInfo.driveTypeDescription,
          fileSystem: diskInfo.fileSystem || "APFS",
          totalBytes: entry.totalKb * 1024,
          usedBytes: entry.usedKb * 1024,
          freeBytes: entry.freeKb * 1024,
          usagePercent: entry.capacityPercent,
          busType: diskInfo.busType,
          mediaType: diskInfo.mediaType,
          model: diskInfo.model,
          isReadOnly: diskInfo.isReadOnly,
          isSystemDrive: isSystem,
          isRemovable: diskInfo.isRemovable,
          networkPath: diskInfo.networkPath,
        };

        drives.push(sanitizeDrive(rawDrive));
      }

      // De-duplicate mountpoints (e.g. APFS root vs Data volume) to present the primary system drive cleanly
      return this.deduplicateMacDrives(drives);
    } catch (error) {
      console.error("MacOSStorageProvider getDrives failed:", error);
      return [];
    }
  }

  private async parseDf(): Promise<DfEntry[]> {
    const { stdout } = await execFileAsync("df", ["-k", "-P"]);
    const lines = stdout.trim().split("\n");
    const entries: DfEntry[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 6) continue;

      const filesystem = parts[0];
      const totalKb = parseInt(parts[1], 10);
      const usedKb = parseInt(parts[2], 10);
      const freeKb = parseInt(parts[3], 10);
      const capacityPercent = parseInt(parts[4].replace("%", ""), 10);
      const mountPoint = parts.slice(5).join(" ");

      // Ignore virtual pseudo filesystems
      if (
        filesystem === "devfs" ||
        filesystem === "map" ||
        filesystem.startsWith("map ") ||
        mountPoint.startsWith("/System/Volumes/Update") ||
        mountPoint.startsWith("/System/Volumes/Preboot") ||
        mountPoint.startsWith("/System/Volumes/VM") ||
        mountPoint.startsWith("/dev") ||
        totalKb <= 0
      ) {
        continue;
      }

      entries.push({
        filesystem,
        totalKb: isNaN(totalKb) ? 0 : totalKb,
        usedKb: isNaN(usedKb) ? 0 : usedKb,
        freeKb: isNaN(freeKb) ? 0 : freeKb,
        capacityPercent: isNaN(capacityPercent) ? 0 : capacityPercent,
        mountPoint,
      });
    }

    return entries;
  }

  private async getDiskutilInfo(
    mountPoint: string,
    filesystem: string,
  ): Promise<{
    volumeName?: string;
    category: "internal" | "removable" | "network" | "virtual" | "optical";
    driveTypeDescription?: string;
    fileSystem?: string;
    busType?: string;
    mediaType?: "SSD" | "HDD" | "NetworkShare" | "Unspecified";
    model?: string;
    isReadOnly: boolean;
    isRemovable: boolean;
    networkPath?: string;
  }> {
    const isNetwork = filesystem.includes("://") || filesystem.startsWith("//");
    if (isNetwork) {
      return {
        category: "network",
        driveTypeDescription: "Network Share",
        fileSystem: "SMB/NFS",
        busType: "Network",
        mediaType: "NetworkShare",
        isReadOnly: false,
        isRemovable: false,
        networkPath: filesystem,
      };
    }

    try {
      const { stdout } = await execFileAsync("diskutil", ["info", mountPoint]);
      const lines = stdout.split("\n");

      let volumeName: string | undefined;
      let isInternal = true;
      let isRemovable = false;
      let isReadOnly = false;
      let fileSystem: string | undefined;
      let busType: string | undefined;
      let isSolidState = false;
      let deviceModel: string | undefined;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("Volume Name:")) {
          volumeName = trimmed.replace("Volume Name:", "").trim();
        } else if (trimmed.startsWith("Internal:")) {
          isInternal = trimmed.includes("Yes");
        } else if (trimmed.startsWith("Removable Media:")) {
          isRemovable = trimmed.includes("Removable");
        } else if (trimmed.startsWith("Read-Only:")) {
          isReadOnly = trimmed.includes("Yes");
        } else if (trimmed.startsWith("Type (Bundle):")) {
          fileSystem = trimmed.replace("Type (Bundle):", "").trim();
        } else if (trimmed.startsWith("Protocol:")) {
          busType = trimmed.replace("Protocol:", "").trim();
        } else if (trimmed.startsWith("Solid State:")) {
          isSolidState = trimmed.includes("Yes");
        } else if (trimmed.startsWith("Device / Media Name:")) {
          deviceModel = trimmed.replace("Device / Media Name:", "").trim();
        }
      }

      const category =
        !isInternal ||
        isRemovable ||
        (busType && busType.toLowerCase().includes("usb"))
          ? "removable"
          : "internal";

      return {
        volumeName: volumeName || undefined,
        category,
        driveTypeDescription:
          category === "removable"
            ? "Removable USB Volume"
            : isSolidState
              ? "Internal Apple SSD"
              : "Internal Drive",
        fileSystem: fileSystem || "APFS",
        busType: busType || (isInternal ? "PCIe" : "USB"),
        mediaType: isSolidState ? "SSD" : "HDD",
        model: deviceModel || undefined,
        isReadOnly,
        isRemovable: category === "removable",
      };
    } catch {
      return {
        category: "internal",
        driveTypeDescription: "Internal Volume",
        fileSystem: "APFS",
        isReadOnly: false,
        isRemovable: false,
      };
    }
  }

  private deduplicateMacDrives(drives: StorageDrive[]): StorageDrive[] {
    const map = new Map<string, StorageDrive>();

    for (const drive of drives) {
      // In macOS, '/' and '/System/Volumes/Data' share the same container.
      // If we have Data volume, prioritize it for accurate user used bytes.
      if (drive.mountPoint === "/") {
        if (!map.has("root")) {
          map.set("root", drive);
        }
      } else if (drive.mountPoint === "/System/Volumes/Data") {
        map.set("root", {
          ...drive,
          mountPoint: "/",
          displayName: drive.volumeName || "Macintosh HD",
          isSystemDrive: true,
        });
      } else {
        map.set(drive.mountPoint, drive);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.isSystemDrive && !b.isSystemDrive) return -1;
      if (!a.isSystemDrive && b.isSystemDrive) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }

  public async getOverview(): Promise<StorageOverview> {
    const drives = await this.getDrives();
    let totalBytes = 0;
    let totalFreeBytes = 0;
    let totalUsedBytes = 0;
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    for (const drive of drives) {
      totalBytes += drive.totalBytes;
      totalFreeBytes += drive.freeBytes;
      totalUsedBytes += drive.usedBytes;

      if (drive.healthStatus === "Healthy") healthyCount++;
      else if (drive.healthStatus === "Warning") warningCount++;
      else if (drive.healthStatus === "Critical") criticalCount++;
    }

    const overallUsagePercent =
      totalBytes > 0
        ? Math.round((totalUsedBytes / totalBytes) * 100 * 10) / 10
        : 0;

    return {
      totalDrives: drives.length,
      totalBytes,
      totalFreeBytes,
      totalUsedBytes,
      overallUsagePercent,
      healthyCount,
      warningCount,
      criticalCount,
      primaryDrive: drives.find((d) => d.isSystemDrive) || drives[0],
    };
  }

  public async ejectDrive(drive: StorageDrive): Promise<boolean> {
    try {
      await execFileAsync("diskutil", ["eject", drive.mountPoint]);
      return true;
    } catch {
      try {
        await execFileAsync("diskutil", ["unmount", drive.mountPoint]);
        return true;
      } catch (error) {
        throw new Error(
          `Failed to unmount/eject ${drive.displayName}: ${(error as Error).message}`,
        );
      }
    }
  }
}
