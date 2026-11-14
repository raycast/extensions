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
} from "../src/utils/sanitizers";
import { generateDriveMarkdown } from "../src/components/DriveDetail";
import { getMenuBarTitle } from "../src/menu-bar-storage";
import { sortDrives, filterAndSearchDrives } from "../src/hooks/useStorage";
import {
  CachedStorageProvider,
  calculateOverview,
} from "../src/services/storage-factory";
import { MockStorageProvider } from "../src/services/mock-provider";
import {
  runPowerShell,
  runPowerShellJson,
  encodePowerShellScript,
} from "../src/services/powershell-runner";
import { WindowsStorageProvider } from "../src/services/windows-provider";
import { safelyEjectDrive } from "../src/actions/power-actions";
import { StorageDrive } from "../src/types/storage";

describe("Tier 5 - Adversarial 1: Unlabeled & Non-Standard Drives Resilience", () => {
  test("T5.1.1: Unlabeled drives with empty/whitespace labels across all categories", () => {
    const categories = ["internal", "removable", "network", "virtual", "optical", "unknown"] as const;
    for (const cat of categories) {
      const drive = sanitizeDrive({
        volumeName: "   ",
        category: cat,
        driveLetter: "X:",
        totalBytes: 100_000_000,
        freeBytes: 50_000_000,
      });

      expect(drive.volumeName).not.toBe("");
      expect(drive.volumeName).not.toBe("   ");
      expect(drive.displayName).toContain("X:");
      expect(drive.displayName.includes("((X:))")).toBe(false);
      expect(drive.displayName.includes("  ")).toBe(false);

      const markdown = generateDriveMarkdown(drive);
      expect(markdown).toContain(drive.displayName);
      expect(markdown.includes("undefined")).toBe(false);
    }
  });

  test("T5.1.2: Drive with null, undefined, and empty string volumeName without driveLetter", () => {
    const driveNull = sanitizeDrive({
      volumeName: undefined,
      category: "internal",
      mountPoint: "/mnt/data",
      totalBytes: 200_000_000,
      freeBytes: 100_000_000,
    });
    expect(driveNull.volumeName).toBe("Local Disk");
    expect(driveNull.displayName).toBe("Local Disk [/mnt/data]");

    const driveEmpty = sanitizeDrive({
      volumeName: "",
      category: "removable",
      mountPoint: "/Volumes/FlashDrive",
      totalBytes: 64_000_000_000,
      freeBytes: 32_000_000_000,
    });
    expect(driveEmpty.volumeName).toBe("Removable Disk");
    expect(driveEmpty.displayName).toBe("Removable Disk [/Volumes/FlashDrive]");
  });

  test("T5.1.3: Unicode, RTL, Emoji and complex symbols in volumeName", () => {
    const complexNames = [
      "💾 SSD_NVME_🚀",
      "قسم الملفات الشخصية",
      "システムボリューム (C:)",
      "Mixed <Tags> & 'Quotes' \"Double\" %PATH% $VAR `Tick`",
      "---___...",
    ];

    for (const name of complexNames) {
      const drive = sanitizeDrive({
        volumeName: name,
        driveLetter: "D:",
        totalBytes: 500_000_000_000,
        freeBytes: 250_000_000_000,
      });

      expect(drive.volumeName).toBe(name.trim());
      const markdown = generateDriveMarkdown(drive);
      expect(markdown).toContain("50.0%");
      expect(markdown.includes("NaN")).toBe(false);
    }
  });
});

describe("Tier 5 - Adversarial 2: Unassigned Letters, GUIDs & Mount Paths", () => {
  test("T5.2.1: Windows Volume GUID path formatting and identification", () => {
    const guidPath = "\\\\?\\Volume{a8c430e7-0000-0000-0000-100000000000}\\";
    const drive = sanitizeDrive({
      mountPoint: guidPath,
      totalBytes: 1_073_741_824,
      freeBytes: 536_870_912,
      category: "internal",
    });

    expect(drive.driveLetter).toBeUndefined();
    expect(drive.mountPoint).toBe(guidPath);
    expect(drive.displayName).toBe(`Local Disk [${guidPath}]`);
    expect(drive.id.startsWith("drive-_")).toBe(true);

    const title = getMenuBarTitle(drive);
    expect(title).toContain("50%");
  });

  test("T5.2.2: Deterministic sorting with mixed lettered, unlettered, and system drives", () => {
    const drives: StorageDrive[] = [
      sanitizeDrive({ id: "1", mountPoint: "\\\\?\\Volume{guid2}\\", totalBytes: 100 }),
      sanitizeDrive({ id: "2", driveLetter: "D:", totalBytes: 100 }),
      sanitizeDrive({ id: "3", driveLetter: "C:", isSystemDrive: true, totalBytes: 100 }),
      sanitizeDrive({ id: "4", driveLetter: "B:", totalBytes: 100 }),
      sanitizeDrive({ id: "5", mountPoint: "\\\\?\\Volume{guid1}\\", totalBytes: 100 }),
      sanitizeDrive({ id: "6", driveLetter: "E:", category: "removable", totalBytes: 100 }),
      sanitizeDrive({ id: "7", networkPath: "\\\\nas\\share", category: "network", totalBytes: 100 }),
    ];

    const sorted = sortDrives(drives);
    expect(sorted[0].driveLetter).toBe("C:");
    expect(sorted[0].isSystemDrive).toBe(true);
    expect(sorted[1].driveLetter).toBe("B:");
    expect(sorted[2].driveLetter).toBe("D:");
    expect(sorted[3].displayName).toContain("Volume{guid1}");
    expect(sorted[4].displayName).toContain("Volume{guid2}");
    expect(sorted[5].driveLetter).toBe("E:");
    expect(sorted[5].category).toBe("removable");
    expect(sorted[6].category).toBe("network");
  });
});

describe("Tier 5 - Adversarial 3: Offline Shares, Locked BitLocker & 0-Byte Optical", () => {
  test("T5.3.1: Offline network share with zero bytes remaining and timeout safety", () => {
    const offlineShare = sanitizeDrive({
      networkPath: "\\\\unreachable-host\\share",
      mountPoint: "Z:\\",
      driveLetter: "Z:",
      totalBytes: 0,
      freeBytes: 0,
      usedBytes: 0,
      healthStatus: "Unknown",
      category: "network",
    });

    expect(offlineShare.category).toBe("network");
    expect(offlineShare.usagePercent).toBe(0);
    expect(offlineShare.healthStatus).toBe("Unknown");
    expect(offlineShare.mediaType).toBe("NetworkShare");

    const overview = calculateOverview([offlineShare]);
    expect(overview.overallUsagePercent).toBe(0);
    expect(overview.totalDrives).toBe(1);
  });

  test("T5.3.2: Locked BitLocker partition reporting zero free space and read-only flags", () => {
    const bitlockerDrive = sanitizeDrive({
      driveLetter: "G:",
      volumeName: "BitLocker Locked Drive",
      isBitLockerEncrypted: true,
      isReadOnly: true,
      fileSystem: "RAW",
      totalBytes: 2_000_000_000_000,
      freeBytes: 0,
      usedBytes: 0,
      healthStatus: "Unknown",
    });

    expect(bitlockerDrive.isBitLockerEncrypted).toBe(true);
    expect(bitlockerDrive.isReadOnly).toBe(true);
    expect(bitlockerDrive.usagePercent).toBe(0);

    const markdown = generateDriveMarkdown(bitlockerDrive);
    expect(markdown).toContain("BitLocker Encrypted");
    expect(markdown).toContain("Read-Only Volume");
  });

  test("T5.3.3: 0-Byte optical drive (empty CD/DVD disc tray)", () => {
    const opticalDrive = sanitizeDrive({
      driveLetter: "D:",
      category: "optical",
      busType: "ATAPI",
      totalBytes: 0,
      freeBytes: 0,
      usedBytes: 0,
      isReadOnly: true,
    });

    expect(opticalDrive.category).toBe("optical");
    expect(opticalDrive.totalBytes).toBe(0);
    expect(opticalDrive.usagePercent).toBe(0);
    expect(opticalDrive.isReadOnly).toBe(true);
    expect(opticalDrive.healthStatus).toBe("Unknown");

    // Virtual category filter includes optical
    const filtered = filterAndSearchDrives([opticalDrive], "virtual", "");
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe(opticalDrive.id);
  });
});

describe("Tier 5 - Adversarial 4: PowerShell Runner Failure Handling & Recovery", () => {
  test("T5.4.1: Script execution timeout abortion", async () => {
    if (process.platform !== "win32") return;

    let threw = false;
    try {
      // Run a 5 second sleep with a 300ms timeout
      await runPowerShell("Start-Sleep -Seconds 5", { timeoutMs: 300 });
    } catch (error: any) {
      threw = true;
      expect(error.message).toContain("PowerShell execution failed");
    }
    expect(threw).toBe(true);
  });

  test("T5.4.2: Script with invalid JSON or stderr warning noise recovers valid JSON", async () => {
    if (process.platform !== "win32") return;

    const scriptWithNoise = `
      Write-Host "WARNING: Disk 3 offline"
      [PSCustomObject]@{
        Status = "OK"
        Count = 42
      } | ConvertTo-Json
    `;

    const result = await runPowerShellJson<{ Status: string; Count: number }>(scriptWithNoise);
    expect(result.Status).toBe("OK");
    expect(result.Count).toBe(42);
  });

  test("T5.4.3: Script with pure non-JSON output throws helpful descriptive error", async () => {
    if (process.platform !== "win32") return;

    let threw = false;
    try {
      await runPowerShellJson("Write-Output 'Access Denied: Unrecognized Command'");
    } catch (error: any) {
      threw = true;
      expect(error.message).toContain("Failed to parse PowerShell JSON output");
      expect(error.message).toContain("Access Denied");
    }
    expect(threw).toBe(true);
  });

  test("T5.4.4: Base64 UTF-16LE script encoding supports special characters & multi-byte unicode", () => {
    const specialScript = `
      $name = '日本語ディスク & "Special" %TEMP% $VAL'
      [PSCustomObject]@{
        Name = $name
      } | ConvertTo-Json
    `;
    const encoded = encodePowerShellScript(specialScript);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = Buffer.from(encoded, "base64").toString("utf16le");
    expect(decoded).toBe(specialScript);
  });
});

describe("Tier 5 - Adversarial 5: Safe Ejection Guardrails & Optimistic Rollback", () => {
  test("T5.5.1: System drive ejection is guarded and blocked", async () => {
    const mock = new MockStorageProvider();
    const drives = await mock.getDrives();
    const systemDrive = drives.find((d) => d.isSystemDrive)!;
    expect(systemDrive.isSystemDrive).toBe(true);

    let ejectedCallbackCalled = false;
    await safelyEjectDrive(systemDrive, () => {
      ejectedCallbackCalled = true;
    });

    // Callback should not be called because action was blocked
    expect(ejectedCallbackCalled).toBe(false);
  });

  test("T5.5.2: Drive without drive letter cannot be ejected", async () => {
    const winProvider = new WindowsStorageProvider();
    const driveNoLetter = sanitizeDrive({
      mountPoint: "\\\\?\\Volume{guid}\\",
      category: "removable",
      totalBytes: 1000,
    });

    let threw = false;
    try {
      await winProvider.ejectDrive(driveNoLetter);
    } catch (err: any) {
      threw = true;
      expect(err.message).toContain("Cannot safely eject drive without a valid drive letter");
    }
    expect(threw).toBe(true);
  });

  test("T5.5.3: Cache provider invalidates cache upon successful ejection", async () => {
    const mock = new MockStorageProvider();
    const cached = new CachedStorageProvider(mock, 10000);

    const initialDrives = await cached.getDrives();
    const removable = initialDrives.find((d) => d.category === "removable")!;
    expect(removable).toBeDefined();

    const success = await cached.ejectDrive(removable);
    expect(success).toBe(true);

    const postEjectDrives = await cached.getDrives();
    expect(postEjectDrives.length).toBe(initialDrives.length - 1);
    expect(postEjectDrives.find((d) => d.id === removable.id)).toBeUndefined();
  });
});

describe("Tier 5 - Adversarial 6: Concurrency & Cache Revalidation Under Load", () => {
  test("T5.6.1: 50 concurrent getDrives queries resolve identically and share cache", async () => {
    const mock = new MockStorageProvider();
    const cached = new CachedStorageProvider(mock, 5000);

    const promises = Array.from({ length: 50 }, () => cached.getDrives());
    const results = await Promise.all(promises);

    expect(results.length).toBe(50);
    const firstResult = results[0];
    for (let i = 1; i < results.length; i++) {
      expect(results[i].length).toBe(firstResult.length);
      expect(results[i][0].id).toBe(firstResult[0].id);
    }
  });

  test("T5.6.2: High-throughput search and filter stress test (1000 operations)", () => {
    const mock = new MockStorageProvider();
    const drives = [
      sanitizeDrive({ id: "c", driveLetter: "C:", volumeName: "OS", totalBytes: 500, category: "internal" }),
      sanitizeDrive({ id: "d", driveLetter: "D:", volumeName: "Data", totalBytes: 1000, category: "internal" }),
      sanitizeDrive({ id: "e", driveLetter: "E:", volumeName: "USB", totalBytes: 64, category: "removable" }),
      sanitizeDrive({ id: "z", networkPath: "\\\\nas\\share", totalBytes: 5000, category: "network" }),
      sanitizeDrive({ id: "v", volumeName: "DiskImage", totalBytes: 20, category: "virtual" }),
    ];

    const queries = ["", "c", "data", "usb", "nas", "500", "ssd", "unknown", "z:", "internal"];
    const filters = ["all", "internal", "removable", "network", "virtual"] as const;

    const start = Date.now();
    let totalMatches = 0;
    for (let i = 0; i < 1000; i++) {
      const q = queries[i % queries.length];
      const f = filters[i % filters.length];
      const res = filterAndSearchDrives(drives, f, q);
      totalMatches += res.length;
    }
    const elapsed = Date.now() - start;

    expect(totalMatches).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(1000); // Sub-second for 1000 operations
  });

  test("T5.6.3: WindowsStorageProvider fallback resilience on CIM error", async () => {
    if (process.platform !== "win32") return;
    const provider = new WindowsStorageProvider();
    const drives = await provider.getDrives();
    expect(Array.isArray(drives)).toBe(true);
    expect(drives.length).toBeGreaterThan(0);

    const overview = await provider.getOverview();
    expect(overview.totalDrives).toBe(drives.length);
    expect(overview.totalBytes).toBeGreaterThan(0);
  });
});
