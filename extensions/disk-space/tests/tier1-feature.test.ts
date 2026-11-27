import { describe, test, expect } from "./test-framework";
import { formatBytes, formatExactBytes, formatPercent } from "../src/utils/formatters";
import { renderSegmentMeter, renderHighResMeter } from "../src/utils/meters";
import { getUsageColor, getHealthColor, getCategoryIcon } from "../src/utils/colors";
import {
  sanitizeDrive,
  normalizeCategory,
  normalizeVolumeName,
  buildDisplayName,
  normalizeHealthStatus,
  normalizeMediaType,
  parseBytes,
  getDefaultTypeDescription,
} from "../src/utils/sanitizers";
import {
  MOCK_NVME_SSD,
  MOCK_SATA_HDD,
  MOCK_USB_FLASH,
  MOCK_BITLOCKER_LOCKED,
  MOCK_OFFLINE_SMB,
  MOCK_EMPTY_OPTICAL,
  MOCK_UNICODE_DRIVE,
  MOCK_ALL_DRIVES,
} from "./mock-data";
import { DriveCategory, DriveTypeFilter, StorageDrive, StorageOverview } from "../src/types/storage";

describe("Tier 1 - Feature 1: Normalized Domain Model & Storage Types", () => {
  test("T1.1.1: StorageDrive interface contains all required attributes", () => {
    const drive: StorageDrive = MOCK_NVME_SSD;
    expect(drive.id).toBe("drive-C");
    expect(drive.mountPoint).toBe("C:\\");
    expect(drive.volumeName).toBe("Windows");
    expect(drive.displayName).toBe("Windows (C:)");
    expect(drive.driveLetter).toBe("C:");
    expect(drive.category).toBe("internal");
    expect(drive.driveTypeDescription).toBe("Internal NVMe SSD");
    expect(drive.fileSystem).toBe("NTFS");
    expect(drive.totalBytes).toBe(1_000_204_886_016);
    expect(drive.usedBytes).toBe(650_133_175_910);
    expect(drive.freeBytes).toBe(350_071_710_106);
    expect(drive.usagePercent).toBe(65.0);
    expect(drive.healthStatus).toBe("Healthy");
    expect(drive.busType).toBe("NVMe");
    expect(drive.mediaType).toBe("SSD");
    expect(drive.isReadOnly).toBe(false);
    expect(drive.isSystemDrive).toBe(true);
    expect(drive.isRemovable).toBe(false);
    expect(drive.isBitLockerEncrypted).toBe(false);
  });

  test("T1.1.2: Removable drive model flags isRemovable correctly", () => {
    const drive: StorageDrive = MOCK_USB_FLASH;
    expect(drive.category).toBe("removable");
    expect(drive.isRemovable).toBe(true);
    expect(drive.isSystemDrive).toBe(false);
    expect(drive.busType).toBe("USB");
    expect(drive.fileSystem).toBe("exFAT");
  });

  test("T1.1.3: Network drive model encapsulates UNC networkPath", () => {
    const drive: StorageDrive = MOCK_OFFLINE_SMB;
    expect(drive.category).toBe("network");
    expect(drive.networkPath).toBe("\\\\nas.corp.local\\backup");
    expect(drive.fileSystem).toBe("SMB");
    expect(drive.mediaType).toBe("NetworkShare");
  });

  test("T1.1.4: BitLocker encrypted drive model flags isBitLockerEncrypted and isReadOnly", () => {
    const drive: StorageDrive = MOCK_BITLOCKER_LOCKED;
    expect(drive.isBitLockerEncrypted).toBe(true);
    expect(drive.isReadOnly).toBe(true);
    expect(drive.healthStatus).toBe("Unknown");
  });

  test("T1.1.5: Optical drive model encapsulates read-only zero-capacity state", () => {
    const drive: StorageDrive = MOCK_EMPTY_OPTICAL;
    expect(drive.category).toBe("optical");
    expect(drive.totalBytes).toBe(0);
    expect(drive.isReadOnly).toBe(true);
    expect(drive.healthStatus).toBe("Unknown");
  });
});

describe("Tier 1 - Feature 2: Capacity Meter Engine", () => {
  test("T1.2.1: renderSegmentMeter produces 10-segment Unicode pill gauge accurately", () => {
    expect(renderSegmentMeter(0)).toBe("▱▱▱▱▱▱▱▱▱▱");
    expect(renderSegmentMeter(10)).toBe("▰▱▱▱▱▱▱▱▱▱");
    expect(renderSegmentMeter(50)).toBe("▰▰▰▰▰▱▱▱▱▱");
    expect(renderSegmentMeter(65)).toBe("▰▰▰▰▰▰▰▱▱▱");
    expect(renderSegmentMeter(82)).toBe("▰▰▰▰▰▰▰▰▱▱");
    expect(renderSegmentMeter(95)).toBe("▰▰▰▰▰▰▰▰▰▰");
    expect(renderSegmentMeter(100)).toBe("▰▰▰▰▰▰▰▰▰▰");
  });

  test("T1.2.2: renderSegmentMeter supports custom segment counts", () => {
    expect(renderSegmentMeter(50, 6)).toBe("▰▰▰▱▱▱");
    expect(renderSegmentMeter(25, 4)).toBe("▰▱▱▱");
    expect(renderSegmentMeter(100, 5)).toBe("▰▰▰▰▰");
    expect(renderSegmentMeter(0, 5)).toBe("▱▱▱▱▱");
  });

  test("T1.2.3: renderSegmentMeter supports custom filled and empty glyphs", () => {
    expect(renderSegmentMeter(50, 4, "#", "-")).toBe("##--");
    expect(renderSegmentMeter(75, 4, "●", "○")).toBe("●●●○");
    expect(renderSegmentMeter(100, 3, "■", "□")).toBe("■■■");
  });

  test("T1.2.4: renderHighResMeter generates 16-segment sub-block Markdown gauge", () => {
    expect(renderHighResMeter(0)).toBe("░░░░░░░░░░░░░░░░");
    expect(renderHighResMeter(50)).toBe("████████░░░░░░░░");
    expect(renderHighResMeter(100)).toBe("████████████████");
    expect(renderHighResMeter(25)).toBe("████░░░░░░░░░░░░");
    expect(renderHighResMeter(75)).toBe("████████████░░░░");
  });

  test("T1.2.5: Capacity meter functions enforce bounds clamping on invalid inputs", () => {
    expect(renderSegmentMeter(-25)).toBe("▱▱▱▱▱▱▱▱▱▱");
    expect(renderSegmentMeter(150)).toBe("▰▰▰▰▰▰▰▰▰▰");
    expect(renderSegmentMeter(NaN)).toBe("▱▱▱▱▱▱▱▱▱▱");
    expect(renderHighResMeter(-10)).toBe("░░░░░░░░░░░░░░░░");
    expect(renderHighResMeter(200)).toBe("████████████████");
    expect(renderSegmentMeter(50, 0)).toBe("");
    expect(renderHighResMeter(50, 0)).toBe("");
  });
});

describe("Tier 1 - Feature 3: Byte & String Formatters", () => {
  test("T1.3.1: formatBytes converts base-1024 exact byte scales correctly", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1.0 TB");
    expect(formatBytes(1024 * 1024 * 1024 * 1024 * 1024)).toBe("1.0 PB");
  });

  test("T1.3.2: formatBytes respects custom decimal precision", () => {
    const bytes = 1_500_000_000; // ~1.39698 GB
    expect(formatBytes(bytes, 0)).toBe("1 GB");
    expect(formatBytes(bytes, 1)).toBe("1.4 GB");
    expect(formatBytes(bytes, 2)).toBe("1.40 GB");
    expect(formatBytes(bytes, 3)).toBe("1.397 GB");
  });

  test("T1.3.3: formatExactBytes formats locale comma numbers with B suffix", () => {
    expect(formatExactBytes(0)).toBe("0 B");
    expect(formatExactBytes(1024)).toBe("1,024 B");
    expect(formatExactBytes(1_000_204_886_016)).toBe("1,000,204,886,016 B");
    expect(formatExactBytes(57_417_891_840)).toBe("57,417,891,840 B");
  });

  test("T1.3.4: formatPercent formats percentage with % suffix and decimals", () => {
    expect(formatPercent(0)).toBe("0.0%");
    expect(formatPercent(50)).toBe("50.0%");
    expect(formatPercent(65.4321, 1)).toBe("65.4%");
    expect(formatPercent(65.4321, 2)).toBe("65.43%");
    expect(formatPercent(100)).toBe("100.0%");
  });

  test("T1.3.5: formatters handle edge cases and negative inputs safely", () => {
    expect(formatBytes(-100)).toBe("0 B");
    expect(formatBytes(NaN)).toBe("0 B");
    expect(formatBytes(Infinity)).toBe("0 B");
    expect(formatExactBytes(-500)).toBe("0 B");
    expect(formatExactBytes(NaN)).toBe("0 B");
    expect(formatPercent(-10)).toBe("0.0%");
    expect(formatPercent(150)).toBe("100.0%");
    expect(formatPercent(NaN)).toBe("0.0%");
  });
});

describe("Tier 1 - Feature 4: Color Threshold Engine", () => {
  test("T1.4.1: getUsageColor returns Green for usage under 70%", () => {
    expect(getUsageColor(0)).toBe("raycast-color-green");
    expect(getUsageColor(25.5)).toBe("raycast-color-green");
    expect(getUsageColor(69.9)).toBe("raycast-color-green");
  });

  test("T1.4.2: getUsageColor returns Yellow for usage between 70% and 84.99%", () => {
    expect(getUsageColor(70.0)).toBe("raycast-color-yellow");
    expect(getUsageColor(75.0)).toBe("raycast-color-yellow");
    expect(getUsageColor(84.99)).toBe("raycast-color-yellow");
  });

  test("T1.4.3: getUsageColor returns Orange for usage between 85% and 89.99%", () => {
    expect(getUsageColor(85.0)).toBe("raycast-color-orange");
    expect(getUsageColor(87.5)).toBe("raycast-color-orange");
    expect(getUsageColor(89.99)).toBe("raycast-color-orange");
  });

  test("T1.4.4: getUsageColor returns Red for critical usage >= 90%", () => {
    expect(getUsageColor(90.0)).toBe("raycast-color-red");
    expect(getUsageColor(95.8)).toBe("raycast-color-red");
    expect(getUsageColor(100.0)).toBe("raycast-color-red");
  });

  test("T1.4.5: getHealthColor maps Healthy, Warning, Critical, and Unknown correctly", () => {
    expect(getHealthColor("Healthy")).toBe("raycast-color-green");
    expect(getHealthColor("Warning")).toBe("raycast-color-orange");
    expect(getHealthColor("Critical")).toBe("raycast-color-red");
    expect(getHealthColor("Unknown")).toBe("raycast-color-secondary");
  });

  test("T1.4.6: getCategoryIcon returns matching Raycast Icons for all categories", () => {
    expect(getCategoryIcon("internal")).toBe("hard-drive");
    expect(getCategoryIcon("removable")).toBe("memory-stick");
    expect(getCategoryIcon("network")).toBe("network");
    expect(getCategoryIcon("virtual")).toBe("cd");
    expect(getCategoryIcon("optical")).toBe("cd");
    expect(getCategoryIcon("unknown")).toBe("hard-drive");
  });
});

describe("Tier 1 - Feature 5 & 6: Drive Normalization & Sanitization", () => {
  test("T1.5.1: sanitizeDrive normalizes raw CIM drive data", () => {
    const rawCim = {
      driveLetter: "C",
      volumeName: "Windows",
      fileSystem: "NTFS",
      totalBytes: 1000204886016,
      freeBytes: 350071710106,
      busType: "NVMe",
      mediaType: "SSD",
      model: "Samsung SSD 980 PRO",
    };
    const drive = sanitizeDrive(rawCim);
    expect(drive.driveLetter).toBe("C:");
    expect(drive.mountPoint).toBe("C:\\");
    expect(drive.displayName).toBe("Windows (C:)");
    expect(drive.category).toBe("internal");
    expect(drive.totalBytes).toBe(1000204886016);
    expect(drive.freeBytes).toBe(350071710106);
    expect(drive.usedBytes).toBe(650133175910);
    expect(drive.usagePercent).toBe(65.0);
    expect(drive.healthStatus).toBe("Healthy");
    expect(drive.mediaType).toBe("SSD");
  });

  test("T1.5.2: normalizeCategory resolves category based on busType and networkPath", () => {
    expect(normalizeCategory("internal")).toBe("internal");
    expect(normalizeCategory(undefined, "USB", false)).toBe("removable");
    expect(normalizeCategory(undefined, "SATA", false)).toBe("internal");
    expect(normalizeCategory(undefined, undefined, false, "\\\\server\\share")).toBe("network");
    expect(normalizeCategory(undefined, "Virtual", false)).toBe("virtual");
  });

  test("T1.5.3: normalizeVolumeName falls back to standard descriptive names", () => {
    expect(normalizeVolumeName("CustomLabel", "internal", "C:")).toBe("CustomLabel");
    expect(normalizeVolumeName("", "internal", "C:")).toBe("Local Disk (C:)");
    expect(normalizeVolumeName(undefined, "removable", "E:")).toBe("Removable Disk (E:)");
    expect(normalizeVolumeName(undefined, "network")).toBe("Network Share");
    expect(normalizeVolumeName(undefined, "optical")).toBe("Optical Disc");
  });

  test("T1.5.4: buildDisplayName formats lettered and non-lettered volumes", () => {
    expect(buildDisplayName("Windows", "C:")).toBe("Windows (C:)");
    expect(buildDisplayName("Windows (C:)", "C:")).toBe("Windows (C:)");
    expect(buildDisplayName("Macintosh HD", undefined, "/")).toBe("Macintosh HD [/]");
    expect(buildDisplayName("/", undefined, "/")).toBe("/");
  });

  test("T1.5.5: normalizeHealthStatus maps usage and explicit status values", () => {
    expect(normalizeHealthStatus("OK", 50, 1000)).toBe("Healthy");
    expect(normalizeHealthStatus("Healthy", 65, 1000)).toBe("Healthy");
    expect(normalizeHealthStatus("Warning", 50, 1000)).toBe("Warning");
    expect(normalizeHealthStatus("Degraded", 50, 1000)).toBe("Warning");
    expect(normalizeHealthStatus("Critical", 50, 1000)).toBe("Critical");
    expect(normalizeHealthStatus("Error", 50, 1000)).toBe("Critical");
    expect(normalizeHealthStatus(undefined, 92, 1000)).toBe("Critical");
    expect(normalizeHealthStatus(undefined, 87, 1000)).toBe("Warning");
    expect(normalizeHealthStatus(undefined, 50, 1000)).toBe("Healthy");
    expect(normalizeHealthStatus(undefined, 0, 0)).toBe("Unknown");
  });
});

describe("Tier 1 - Feature 16, 17, 18: Search & Category Filter Logic", () => {
  function filterDrives(drives: StorageDrive[], filter: DriveTypeFilter, query = ""): StorageDrive[] {
    return drives.filter((drive) => {
      // Category filter
      if (filter !== "all") {
        if (filter === "internal" && drive.category !== "internal") return false;
        if (filter === "removable" && drive.category !== "removable") return false;
        if (filter === "network" && drive.category !== "network") return false;
        if (filter === "virtual" && drive.category !== "virtual" && drive.category !== "optical") return false;
      }
      // Search query
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const letter = (drive.driveLetter || "").toLowerCase();
        const name = (drive.volumeName || "").toLowerCase();
        const display = (drive.displayName || "").toLowerCase();
        const model = (drive.model || "").toLowerCase();
        const fs = (drive.fileSystem || "").toLowerCase();
        const path = (drive.networkPath || drive.mountPoint || "").toLowerCase();
        return (
          letter.includes(q) ||
          name.includes(q) ||
          display.includes(q) ||
          model.includes(q) ||
          fs.includes(q) ||
          path.includes(q)
        );
      }
      return true;
    });
  }

  test("T1.6.1: Category filter 'all' returns all drives", () => {
    const results = filterDrives(MOCK_ALL_DRIVES, "all");
    expect(results.length).toBe(7);
  });

  test("T1.6.2: Category filter 'internal' returns only internal drives", () => {
    const results = filterDrives(MOCK_ALL_DRIVES, "internal");
    expect(results.length).toBe(3); // C, D, F (BitLocker is internal)
    results.forEach((d) => expect(d.category).toBe("internal"));
  });

  test("T1.6.3: Category filter 'removable' returns only removable USB drives", () => {
    const results = filterDrives(MOCK_ALL_DRIVES, "removable");
    expect(results.length).toBe(2); // E (SanDisk), H (Unicode USB)
    results.forEach((d) => expect(d.category).toBe("removable"));
  });

  test("T1.6.4: Category filter 'network' returns only network shares", () => {
    const results = filterDrives(MOCK_ALL_DRIVES, "network");
    expect(results.length).toBe(1); // Z
    expect(results[0].id).toBe("drive-Z");
  });

  test("T1.6.5: Search filter matches drive letter, volume label, model, and filesystem", () => {
    expect(filterDrives(MOCK_ALL_DRIVES, "all", "C:").length).toBe(1);
    expect(filterDrives(MOCK_ALL_DRIVES, "all", "Samsung").length).toBe(2); // C and F
    expect(filterDrives(MOCK_ALL_DRIVES, "all", "exFAT").length).toBe(1); // E
    expect(filterDrives(MOCK_ALL_DRIVES, "all", "Backup").length).toBe(2); // Z and H
    expect(filterDrives(MOCK_ALL_DRIVES, "all", "NonExistentQuery").length).toBe(0);
  });
});

describe("Tier 1 - Feature StorageOverview: Aggregation Calculations", () => {
  function computeOverview(drives: StorageDrive[]): StorageOverview {
    let totalBytes = 0;
    let totalUsedBytes = 0;
    let totalFreeBytes = 0;
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    for (const drive of drives) {
      totalBytes += drive.totalBytes;
      totalUsedBytes += drive.usedBytes;
      totalFreeBytes += drive.freeBytes;

      if (drive.healthStatus === "Healthy") healthyCount++;
      else if (drive.healthStatus === "Warning") warningCount++;
      else if (drive.healthStatus === "Critical") criticalCount++;
    }

    const overallUsagePercent =
      totalBytes > 0 ? Math.round(((totalUsedBytes / totalBytes) * 100) * 10) / 10 : 0;
    const primaryDrive = drives.find((d) => d.isSystemDrive) || drives[0];

    return {
      totalDrives: drives.length,
      totalBytes,
      totalUsedBytes,
      totalFreeBytes,
      overallUsagePercent,
      healthyCount,
      warningCount,
      criticalCount,
      primaryDrive,
    };
  }

  test("T1.7.1: computeOverview sums capacities accurately across multi-drive set", () => {
    const overview = computeOverview(MOCK_ALL_DRIVES);
    expect(overview.totalDrives).toBe(7);
    expect(overview.totalBytes).toBe(18_559_025_741_824);
    expect(overview.totalUsedBytes).toBe(4_688_336_059_268);
    expect(overview.totalFreeBytes).toBe(2_375_465_542_780);
    expect(overview.overallUsagePercent).toBe(25.3);
  });

  test("T1.7.2: computeOverview aggregates health status distribution correctly", () => {
    const overview = computeOverview(MOCK_ALL_DRIVES);
    expect(overview.healthyCount).toBe(3); // C, E, H
    expect(overview.warningCount).toBe(1); // D
    expect(overview.criticalCount).toBe(0);
  });

  test("T1.7.3: computeOverview designates primary system drive accurately", () => {
    const overview = computeOverview(MOCK_ALL_DRIVES);
    expect(overview.primaryDrive).toBeDefined();
    expect(overview.primaryDrive?.driveLetter).toBe("C:");
    expect(overview.primaryDrive?.isSystemDrive).toBe(true);
  });

  test("T1.7.4: computeOverview handles empty drive collection gracefully", () => {
    const overview = computeOverview([]);
    expect(overview.totalDrives).toBe(0);
    expect(overview.totalBytes).toBe(0);
    expect(overview.totalUsedBytes).toBe(0);
    expect(overview.totalFreeBytes).toBe(0);
    expect(overview.overallUsagePercent).toBe(0);
    expect(overview.primaryDrive).toBeUndefined();
  });
});
