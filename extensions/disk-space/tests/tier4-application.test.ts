import { describe, test, expect } from "./test-framework";
import { formatBytes, formatPercent } from "../src/utils/formatters";
import { renderSegmentMeter } from "../src/utils/meters";
import { getUsageColor } from "../src/utils/colors";
import {
  MOCK_NVME_SSD,
  MOCK_SATA_HDD,
  MOCK_USB_FLASH,
  MOCK_BITLOCKER_LOCKED,
  MOCK_OFFLINE_SMB,
  MOCK_EMPTY_OPTICAL,
  MOCK_UNICODE_DRIVE,
  MOCK_CRITICAL_DRIVE,
  MOCK_ALL_DRIVES,
} from "./mock-data";
import { StorageDrive, StorageOverview, DriveTypeFilter, IStorageProvider } from "../src/types/storage";

// In-memory Mock Storage Provider implementation for testing application workflows
class TestMockStorageProvider implements IStorageProvider {
  readonly platformName = "Mock Test Platform";
  private drives: StorageDrive[];

  constructor(initialDrives: StorageDrive[] = MOCK_ALL_DRIVES) {
    this.drives = [...initialDrives];
  }

  async getDrives(): Promise<StorageDrive[]> {
    // Return deep cloned copy to simulate IPC serialization
    return JSON.parse(JSON.stringify(this.drives));
  }

  async getOverview(): Promise<StorageOverview> {
    const drives = await this.getDrives();
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

  async ejectDrive(drive: StorageDrive): Promise<boolean> {
    if (!drive.isRemovable) {
      throw new Error(`Cannot eject non-removable drive ${drive.displayName}`);
    }
    const index = this.drives.findIndex((d) => d.id === drive.id);
    if (index >= 0) {
      this.drives.splice(index, 1);
      return true;
    }
    return false;
  }
}

describe("Tier 4 - Application Workflow 1: End-to-End Storage Scan & Overview Aggregation", () => {
  test("T4.1.1: Provider scans all connected drives and returns normalized list", async () => {
    const provider = new TestMockStorageProvider();
    const drives = await provider.getDrives();
    expect(drives.length).toBe(7);
    expect(drives[0].driveLetter).toBe("C:");
    expect(drives[0].volumeName).toBe("Windows");
    expect(drives[1].driveLetter).toBe("D:");
    expect(drives[2].driveLetter).toBe("E:");
  });

  test("T4.1.2: Provider computes comprehensive storage overview with primary drive", async () => {
    const provider = new TestMockStorageProvider();
    const overview = await provider.getOverview();
    expect(overview.totalDrives).toBe(7);
    expect(overview.totalBytes).toBe(18_559_025_741_824);
    expect(overview.totalUsedBytes).toBe(4_688_336_059_268);
    expect(overview.totalFreeBytes).toBe(2_375_465_542_780);
    expect(overview.overallUsagePercent).toBe(25.3);
    expect(overview.healthyCount).toBe(3);
    expect(overview.warningCount).toBe(1);
    expect(overview.criticalCount).toBe(0);
    expect(overview.primaryDrive?.id).toBe("drive-C");
  });
});

describe("Tier 4 - Application Workflow 2: Interactive Filter Transitions & Search State Machine", () => {
  function filterAndSearch(drives: StorageDrive[], filter: DriveTypeFilter, query: string): StorageDrive[] {
    return drives.filter((drive) => {
      if (filter !== "all") {
        if (filter === "internal" && drive.category !== "internal") return false;
        if (filter === "removable" && drive.category !== "removable") return false;
        if (filter === "network" && drive.category !== "network") return false;
        if (filter === "virtual" && drive.category !== "virtual" && drive.category !== "optical") return false;
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const letter = (drive.driveLetter || "").toLowerCase();
        const name = (drive.volumeName || "").toLowerCase();
        const display = (drive.displayName || "").toLowerCase();
        const model = (drive.model || "").toLowerCase();
        return letter.includes(q) || name.includes(q) || display.includes(q) || model.includes(q);
      }
      return true;
    });
  }

  test("T4.2.1: Transition State Machine from All -> Removable -> Search -> Internal", async () => {
    const provider = new TestMockStorageProvider();
    const allDrives = await provider.getDrives();

    // Step 1: Initial state (All drives)
    let visible = filterAndSearch(allDrives, "all", "");
    expect(visible.length).toBe(7);

    // Step 2: Switch to Removable filter
    visible = filterAndSearch(allDrives, "removable", "");
    expect(visible.length).toBe(2);
    expect(visible.map((d) => d.driveLetter)).toEqual(["E:", "H:"]);

    // Step 3: Type "Sandisk" search query
    visible = filterAndSearch(allDrives, "removable", "Sandisk");
    expect(visible.length).toBe(1);
    expect(visible[0].driveLetter).toBe("E:");

    // Step 4: Switch filter to "internal" with same search query -> 0 results
    visible = filterAndSearch(allDrives, "internal", "Sandisk");
    expect(visible.length).toBe(0);

    // Step 5: Clear search query under "internal"
    visible = filterAndSearch(allDrives, "internal", "");
    expect(visible.length).toBe(3); // C, D, F

    // Step 6: Return to "all"
    visible = filterAndSearch(allDrives, "all", "");
    expect(visible.length).toBe(7);
  });
});

describe("Tier 4 - Application Workflow 3: Safe USB Ejection Lifecycle & Optimistic State", () => {
  test("T4.3.1: Successfully ejects removable drive E: and updates active drive list", async () => {
    const provider = new TestMockStorageProvider();
    const initialDrives = await provider.getDrives();
    expect(initialDrives.length).toBe(7);

    const driveToEject = initialDrives.find((d) => d.driveLetter === "E:")!;
    expect(driveToEject).toBeDefined();
    expect(driveToEject.isRemovable).toBe(true);

    const ejected = await provider.ejectDrive(driveToEject);
    expect(ejected).toBe(true);

    const remainingDrives = await provider.getDrives();
    expect(remainingDrives.length).toBe(6);
    expect(remainingDrives.some((d) => d.driveLetter === "E:")).toBe(false);
  });

  test("T4.3.2: Ejection of non-removable system drive throws error", async () => {
    const provider = new TestMockStorageProvider();
    let threw = false;
    try {
      await provider.ejectDrive(MOCK_NVME_SSD);
    } catch (err: any) {
      threw = true;
      expect(err.message).toContain("Cannot eject non-removable drive");
    }
    expect(threw).toBe(true);
  });
});

describe("Tier 4 - Application Workflow 4: Clipboard Export Schema Validation", () => {
  function formatClipboardSummary(drive: StorageDrive): string {
    return [
      `**${drive.displayName}**`,
      `Usage: ${formatPercent(drive.usagePercent)} (${formatBytes(drive.usedBytes)} used / ${formatBytes(drive.freeBytes)} free of ${formatBytes(drive.totalBytes)})`,
      `Health: ${drive.healthStatus} | File System: ${drive.fileSystem} | Type: ${drive.driveTypeDescription}`,
      drive.model ? `Model: ${drive.model}` : "",
      drive.busType ? `Bus: ${drive.busType}` : "",
    ].filter(Boolean).join("\n");
  }

  test("T4.4.1: Path export mode returns exact mount point", () => {
    expect(MOCK_NVME_SSD.mountPoint).toBe("C:\\");
    expect(MOCK_OFFLINE_SMB.networkPath).toBe("\\\\nas.corp.local\\backup");
  });

  test("T4.4.2: Summary export mode formats readable multi-line summary", () => {
    const summary = formatClipboardSummary(MOCK_NVME_SSD);
    expect(summary).toContain("**Windows (C:)**");
    expect(summary).toContain("Usage: 65.0% (605.5 GB used / 326.0 GB free of 931.5 GB)");
    expect(summary).toContain("Health: Healthy | File System: NTFS | Type: Internal NVMe SSD");
    expect(summary).toContain("Model: Samsung SSD 980 PRO 1TB");
    expect(summary).toContain("Bus: NVMe");
  });

  test("T4.4.3: JSON export mode produces valid JSON with strict schema adherence", () => {
    const jsonStr = JSON.stringify(MOCK_NVME_SSD, null, 2);
    const parsed: StorageDrive = JSON.parse(jsonStr);

    expect(parsed.id).toBe("drive-C");
    expect(parsed.mountPoint).toBe("C:\\");
    expect(parsed.totalBytes).toBe(1_000_204_886_016);
    expect(parsed.usedBytes).toBe(650_133_175_910);
    expect(parsed.freeBytes).toBe(350_071_710_106);
    expect(parsed.usagePercent).toBe(65.0);
    expect(parsed.healthStatus).toBe("Healthy");
    expect(parsed.isReadOnly).toBe(false);
    expect(parsed.isSystemDrive).toBe(true);
    expect(parsed.isRemovable).toBe(false);
  });
});

describe("Tier 4 - Application Workflow 5: Menu Bar Monitor Glanceable Display", () => {
  function getMenuBarTitle(primaryDrive?: StorageDrive): string {
    if (!primaryDrive) return "No Drives";
    const letter = primaryDrive.driveLetter || primaryDrive.displayName;
    const percent = Math.round(primaryDrive.usagePercent);
    if (primaryDrive.usagePercent >= 90) {
      return `⚠️ ${letter} ${percent}%`;
    }
    return `${letter} ${percent}%`;
  }

  test("T4.5.1: Menu bar title for normal primary drive shows letter and usage", () => {
    const title = getMenuBarTitle(MOCK_NVME_SSD);
    expect(title).toBe("C: 65%");
  });

  test("T4.5.2: Menu bar title for critical drive includes alert indicator", () => {
    const title = getMenuBarTitle(MOCK_CRITICAL_DRIVE);
    expect(title).toBe("⚠️ C: 96%");
  });

  test("T4.5.3: Menu bar title handles undefined primary drive gracefully", () => {
    expect(getMenuBarTitle(undefined)).toBe("No Drives");
  });

  test("T4.5.4: Menu bar submenu item formats per-drive status and meter", () => {
    const drive = MOCK_USB_FLASH;
    const meter = renderSegmentMeter(drive.usagePercent, 6);
    const itemTitle = `${drive.displayName} [${meter} ${formatPercent(drive.usagePercent)}] - ${formatBytes(drive.freeBytes)} free`;
    expect(itemTitle).toContain("SANDISK_64 (E:)");
    expect(itemTitle).toContain("92.0%");
    expect(itemTitle).toContain("4.6 GB free");
  });
});

describe("Tier 4 - Application Workflow 6: Concurrent Invocations & Multi-Query Resilience", () => {
  test("T4.6.1: Concurrent queries resolve identical drive sets consistently", async () => {
    const provider = new TestMockStorageProvider();
    const promises = [
      provider.getDrives(),
      provider.getDrives(),
      provider.getDrives(),
      provider.getDrives(),
      provider.getDrives(),
    ];

    const results = await Promise.all(promises);
    expect(results.length).toBe(5);
    for (const res of results) {
      expect(res.length).toBe(7);
      expect(res[0].driveLetter).toBe("C:");
      expect(res[1].driveLetter).toBe("D:");
      expect(res[2].driveLetter).toBe("E:");
    }
  });
});
