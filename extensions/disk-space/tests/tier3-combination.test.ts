import { describe, test, expect } from "./test-framework";
import { formatBytes, formatExactBytes, formatPercent } from "../src/utils/formatters";
import { renderSegmentMeter, renderHighResMeter } from "../src/utils/meters";
import { getUsageColor, getHealthColor, getCategoryIcon } from "../src/utils/colors";
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
import { StorageDrive } from "../src/types/storage";

describe("Tier 3 - Pairwise 1: Removable Drive + Critical Space (>=90%)", () => {
  const drive: StorageDrive = MOCK_USB_FLASH;

  test("T3.1.1: Category and Icon map to Removable USB", () => {
    expect(drive.category).toBe("removable");
    expect(drive.isRemovable).toBe(true);
    expect(getCategoryIcon(drive.category)).toBe("memory-stick");
  });

  test("T3.1.2: Usage percentage 92.0% maps to Critical Red color", () => {
    expect(drive.usagePercent).toBe(92.0);
    expect(getUsageColor(drive.usagePercent)).toBe("raycast-color-red");
    expect(formatPercent(drive.usagePercent)).toBe("92.0%");
  });

  test("T3.1.3: Visual gauges show critical saturation", () => {
    // 10-seg meter: 9 out of 10 filled
    expect(renderSegmentMeter(drive.usagePercent)).toBe("▰▰▰▰▰▰▰▰▰▱");
    // 16-seg meter: round(0.92 * 16) = round(14.72) = 15 filled
    expect(renderHighResMeter(drive.usagePercent)).toBe("███████████████░");
  });

  test("T3.1.4: Formatted capacity stats show exact remaining free space", () => {
    expect(formatBytes(drive.totalBytes)).toBe("58.1 GB");
    expect(formatBytes(drive.usedBytes)).toBe("53.5 GB");
    expect(formatBytes(drive.freeBytes)).toBe("4.6 GB");
    expect(formatExactBytes(drive.freeBytes)).toBe("4,992,860,160 B");
  });

  test("T3.1.5: Removable drive qualifies for Safe Ejection action", () => {
    expect(drive.isRemovable).toBe(true);
    expect(drive.isSystemDrive).toBe(false);
  });
});

describe("Tier 3 - Pairwise 2: Network Share + Offline State + Revalidation", () => {
  const drive: StorageDrive = MOCK_OFFLINE_SMB;

  test("T3.2.1: Category maps to Network with Network icon", () => {
    expect(drive.category).toBe("network");
    expect(getCategoryIcon(drive.category)).toBe("network");
    expect(drive.networkPath).toBe("\\\\nas.corp.local\\backup");
  });

  test("T3.2.2: Offline state sets Unknown health with secondary text color", () => {
    expect(drive.healthStatus).toBe("Unknown");
    expect(getHealthColor(drive.healthStatus)).toBe("raycast-color-secondary");
  });

  test("T3.2.3: Inaccessible usage produces 0% meter without throwing errors", () => {
    expect(drive.usedBytes).toBe(0);
    expect(drive.freeBytes).toBe(0);
    expect(drive.usagePercent).toBe(0.0);
    expect(renderSegmentMeter(drive.usagePercent)).toBe("▱▱▱▱▱▱▱▱▱▱");
    expect(renderHighResMeter(drive.usagePercent)).toBe("░░░░░░░░░░░░░░░░");
  });

  test("T3.2.4: Explorer/Finder target resolves to network UNC path", () => {
    const explorerTarget = drive.networkPath || drive.mountPoint;
    expect(explorerTarget).toBe("\\\\nas.corp.local\\backup");
  });
});

describe("Tier 3 - Pairwise 3: System Drive + Windows Disk Cleanup Action Integration", () => {
  const systemDrive: StorageDrive = MOCK_NVME_SSD;

  test("T3.3.1: System drive is properly flagged", () => {
    expect(systemDrive.isSystemDrive).toBe(true);
    expect(systemDrive.driveLetter).toBe("C:");
    expect(systemDrive.category).toBe("internal");
  });

  test("T3.3.2: Disk Cleanup command argument synthesis scopes to system drive letter", () => {
    const driveLetter = systemDrive.driveLetter?.replace(":", "") || "C";
    const cleanupCommand = `cleanmgr.exe /d ${driveLetter}`;
    expect(cleanupCommand).toBe("cleanmgr.exe /d C");
  });

  test("T3.3.3: Terminal launcher resolves root directory path", () => {
    const terminalDir = systemDrive.mountPoint;
    expect(terminalDir).toBe("C:\\");
  });

  test("T3.3.4: System drive cannot be safely ejected", () => {
    expect(systemDrive.isRemovable).toBe(false);
  });
});

describe("Tier 3 - Pairwise 4: Unlabeled Drive + Split-Pane Detail + Markdown Gauge", () => {
  function generateDetailMarkdown(drive: StorageDrive): string {
    const gauge = renderHighResMeter(drive.usagePercent, 16);
    const colorWord = drive.usagePercent >= 90 ? "🔴 Critical" : drive.usagePercent >= 85 ? "🟠 Warning" : drive.usagePercent >= 70 ? "🟡 Moderate" : "🟢 Normal";
    return [
      `# ${drive.displayName}`,
      `\`${gauge}\` **${formatPercent(drive.usagePercent)}** (${colorWord})`,
      "",
      "### Storage Breakdown",
      `- **Used Space**: ${formatBytes(drive.usedBytes)} (${formatExactBytes(drive.usedBytes)})`,
      `- **Free Space**: ${formatBytes(drive.freeBytes)} (${formatExactBytes(drive.freeBytes)})`,
      `- **Total Capacity**: ${formatBytes(drive.totalBytes)} (${formatExactBytes(drive.totalBytes)})`,
      "",
      "### Hardware & System Details",
      `- **File System**: ${drive.fileSystem}`,
      `- **Drive Category**: ${drive.driveTypeDescription}`,
      `- **Health Status**: ${drive.healthStatus}`,
      drive.model ? `- **Hardware Model**: ${drive.model}` : "",
      drive.busType ? `- **Bus Interface**: ${drive.busType}` : "",
    ].filter(Boolean).join("\n");
  }

  test("T3.4.1: Detail markdown formats header and high-res meter accurately", () => {
    const md = generateDetailMarkdown(MOCK_SATA_HDD);
    expect(md).toContain("# Data (D:)");
    expect(md).toContain("`█████████████░░░`");
    expect(md).toContain("**82.0%**");
    expect(md).toContain("🟡 Moderate");
  });

  test("T3.4.2: Detail markdown contains formatted byte counts and hardware metadata", () => {
    const md = generateDetailMarkdown(MOCK_SATA_HDD);
    expect(md).toContain("Used Space**: 3.0 TB");
    expect(md).toContain("Free Space**: 670.7 GB");
    expect(md).toContain("Hardware Model**: WDC WD40EZAZ-00SF3B0");
    expect(md).toContain("Bus Interface**: SATA");
  });

  test("T3.4.3: Detail markdown handles drive without model or busType without blank lines", () => {
    const driveWithoutModel: StorageDrive = {
      ...MOCK_SATA_HDD,
      model: undefined,
      busType: undefined,
    };
    const md = generateDetailMarkdown(driveWithoutModel);
    expect(md).not.toContain("Hardware Model");
    expect(md).not.toContain("Bus Interface");
  });
});

describe("Tier 3 - Pairwise 5: BitLocker Encrypted Volume + Overview Aggregation", () => {
  test("T3.5.1: BitLocker volume preserves total capacity while reporting 0 used/free safely", () => {
    const drive = MOCK_BITLOCKER_LOCKED;
    expect(drive.totalBytes).toBe(500_107_862_016);
    expect(drive.usedBytes).toBe(0);
    expect(drive.freeBytes).toBe(0);
    expect(formatBytes(drive.totalBytes)).toBe("465.8 GB");
  });

  test("T3.5.2: Aggregating BitLocker drive does not skew overall percent calculation", () => {
    const drives = [MOCK_NVME_SSD, MOCK_BITLOCKER_LOCKED];
    const totalBytes = drives.reduce((acc, d) => acc + d.totalBytes, 0);
    const totalUsed = drives.reduce((acc, d) => acc + d.usedBytes, 0);
    const percent = Math.round(((totalUsed / totalBytes) * 100) * 10) / 10;
    expect(totalBytes).toBe(1_000_204_886_016 + 500_107_862_016);
    expect(percent).toBe(43.3);
  });
});

describe("Tier 3 - Pairwise 6: Multi-Drive Sorting & Priority Ordering", () => {
  function sortDrives(drives: StorageDrive[]): StorageDrive[] {
    return [...drives].sort((a, b) => {
      // 1. System drive first
      if (a.isSystemDrive && !b.isSystemDrive) return -1;
      if (!a.isSystemDrive && b.isSystemDrive) return 1;

      // 2. Category order: internal < removable < network < virtual < optical < unknown
      const categoryOrder: Record<string, number> = {
        internal: 1,
        removable: 2,
        network: 3,
        virtual: 4,
        optical: 5,
        unknown: 6,
      };
      const catA = categoryOrder[a.category] || 99;
      const catB = categoryOrder[b.category] || 99;
      if (catA !== catB) return catA - catB;

      // 3. Drive letter alphabetical
      if (a.driveLetter && b.driveLetter) {
        return a.driveLetter.localeCompare(b.driveLetter);
      }
      return a.displayName.localeCompare(b.displayName);
    });
  }

  test("T3.6.1: sortDrives prioritizes System drive at index 0", () => {
    const sorted = sortDrives(MOCK_ALL_DRIVES);
    expect(sorted[0].id).toBe("drive-C");
    expect(sorted[0].isSystemDrive).toBe(true);
  });

  test("T3.6.2: sortDrives orders internal drives before removable drives", () => {
    const sorted = sortDrives(MOCK_ALL_DRIVES);
    const internalIndices = sorted
      .map((d, idx) => (d.category === "internal" ? idx : -1))
      .filter((i) => i >= 0);
    const removableIndices = sorted
      .map((d, idx) => (d.category === "removable" ? idx : -1))
      .filter((i) => i >= 0);

    const maxInternalIndex = Math.max(...internalIndices);
    const minRemovableIndex = Math.min(...removableIndices);
    expect(maxInternalIndex).toBeLessThan(minRemovableIndex);
  });

  test("T3.6.3: sortDrives orders network and optical drives after removable drives", () => {
    const sorted = sortDrives(MOCK_ALL_DRIVES);
    const lastDrives = sorted.slice(-2);
    const categories = lastDrives.map((d) => d.category);
    expect(categories).toContain("network");
    expect(categories).toContain("optical");
  });
});
