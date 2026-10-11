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

describe("Tier 2 - Boundary: Zero Bytes, Full Capacity & 100% Saturation", () => {
  test("T2.1.1: 0 B total capacity drive produces safe 0% usage and empty meter", () => {
    const raw = {
      driveLetter: "G",
      category: "optical" as const,
      totalBytes: 0,
      freeBytes: 0,
      usedBytes: 0,
    };
    const drive = sanitizeDrive(raw);
    expect(drive.totalBytes).toBe(0);
    expect(drive.usedBytes).toBe(0);
    expect(drive.freeBytes).toBe(0);
    expect(drive.usagePercent).toBe(0);
    expect(renderSegmentMeter(drive.usagePercent)).toBe("▱▱▱▱▱▱▱▱▱▱");
    expect(renderHighResMeter(drive.usagePercent)).toBe("░░░░░░░░░░░░░░░░");
    expect(formatBytes(drive.totalBytes)).toBe("0 B");
  });

  test("T2.1.2: 100% saturated drive (0 free bytes) produces full meter and Red color", () => {
    const raw = {
      driveLetter: "E",
      totalBytes: 100_000_000_000,
      freeBytes: 0,
      usedBytes: 100_000_000_000,
    };
    const drive = sanitizeDrive(raw);
    expect(drive.usagePercent).toBe(100.0);
    expect(drive.healthStatus).toBe("Critical");
    expect(renderSegmentMeter(drive.usagePercent)).toBe("▰▰▰▰▰▰▰▰▰▰");
    expect(renderHighResMeter(drive.usagePercent)).toBe("████████████████");
    expect(getUsageColor(drive.usagePercent)).toBe("raycast-color-red");
    expect(formatPercent(drive.usagePercent)).toBe("100.0%");
  });

  test("T2.1.3: Single-byte free space edge condition (99.999% full)", () => {
    const total = 1_000_000_000_000;
    const free = 1;
    const used = total - free;
    const raw = {
      driveLetter: "D",
      totalBytes: total,
      freeBytes: free,
      usedBytes: used,
    };
    const drive = sanitizeDrive(raw);
    expect(drive.usagePercent).toBe(100.0);
    expect(drive.healthStatus).toBe("Critical");
    expect(getUsageColor(drive.usagePercent)).toBe("raycast-color-red");
  });

  test("T2.1.4: 0% used drive (100% free) produces Green color and empty meter", () => {
    const raw = {
      driveLetter: "F",
      totalBytes: 500_000_000_000,
      freeBytes: 500_000_000_000,
      usedBytes: 0,
    };
    const drive = sanitizeDrive(raw);
    expect(drive.usagePercent).toBe(0.0);
    expect(drive.healthStatus).toBe("Healthy");
    expect(getUsageColor(drive.usagePercent)).toBe("raycast-color-green");
    expect(renderSegmentMeter(drive.usagePercent)).toBe("▱▱▱▱▱▱▱▱▱▱");
  });
});

describe("Tier 2 - Boundary: Exact Color Threshold Boundaries", () => {
  test("T2.2.1: Boundary at 69.9% (Green) vs 70.0% (Yellow)", () => {
    expect(getUsageColor(69.89)).toBe("raycast-color-green");
    expect(getUsageColor(69.99)).toBe("raycast-color-green");
    expect(getUsageColor(70.00)).toBe("raycast-color-yellow");
    expect(getUsageColor(70.01)).toBe("raycast-color-yellow");
  });

  test("T2.2.2: Boundary at 84.9% (Yellow) vs 85.0% (Orange)", () => {
    expect(getUsageColor(84.89)).toBe("raycast-color-yellow");
    expect(getUsageColor(84.99)).toBe("raycast-color-yellow");
    expect(getUsageColor(85.00)).toBe("raycast-color-orange");
    expect(getUsageColor(85.01)).toBe("raycast-color-orange");
  });

  test("T2.2.3: Boundary at 89.9% (Orange) vs 90.0% (Red)", () => {
    expect(getUsageColor(89.89)).toBe("raycast-color-orange");
    expect(getUsageColor(89.99)).toBe("raycast-color-orange");
    expect(getUsageColor(90.00)).toBe("raycast-color-red");
    expect(getUsageColor(90.01)).toBe("raycast-color-red");
  });

  test("T2.2.4: Sub-segment rounding transitions for 10-segment Unicode meter", () => {
    // 0-4% -> 0 bars, 5-14% -> 1 bar, 15-24% -> 2 bars, etc.
    expect(renderSegmentMeter(4.9)).toBe("▱▱▱▱▱▱▱▱▱▱");
    expect(renderSegmentMeter(5.0)).toBe("▰▱▱▱▱▱▱▱▱▱");
    expect(renderSegmentMeter(14.9)).toBe("▰▱▱▱▱▱▱▱▱▱");
    expect(renderSegmentMeter(15.0)).toBe("▰▰▱▱▱▱▱▱▱▱");
    expect(renderSegmentMeter(84.9)).toBe("▰▰▰▰▰▰▰▰▱▱");
    expect(renderSegmentMeter(85.0)).toBe("▰▰▰▰▰▰▰▰▰▱");
    expect(renderSegmentMeter(94.9)).toBe("▰▰▰▰▰▰▰▰▰▱");
    expect(renderSegmentMeter(95.0)).toBe("▰▰▰▰▰▰▰▰▰▰");
  });
});

describe("Tier 2 - Boundary: Negative, NaN, Infinity & Malformed Values", () => {
  test("T2.3.1: parseBytes normalizes negative and non-numeric inputs to 0", () => {
    expect(parseBytes(-1024)).toBe(0);
    expect(parseBytes(NaN)).toBe(0);
    expect(parseBytes(Infinity)).toBe(0);
    expect(parseBytes(-Infinity)).toBe(0);
    expect(parseBytes(undefined)).toBe(0);
    expect(parseBytes(null as any)).toBe(0);
    expect(parseBytes("not-a-number")).toBe(0);
  });

  test("T2.3.2: parseBytes correctly parses valid string-encoded numbers", () => {
    expect(parseBytes("1048576")).toBe(1048576);
    expect(parseBytes("  500000  ")).toBe(500000);
  });

  test("T2.3.3: formatBytes handles extreme values: Petabytes and Exabytes", () => {
    const onePB = Math.pow(1024, 5); // 1,125,899,906,842,624 bytes
    const tenPB = 10 * onePB;
    expect(formatBytes(onePB)).toBe("1.0 PB");
    expect(formatBytes(tenPB)).toBe("10.0 PB");
    const oneEB = Math.pow(1024, 6);
    expect(formatBytes(oneEB)).toBe("1.0 EB");
  });

  test("T2.3.4: formatPercent clamps negative and out-of-range values", () => {
    expect(formatPercent(-99.9)).toBe("0.0%");
    expect(formatPercent(999.9)).toBe("100.0%");
    expect(formatPercent(NaN)).toBe("0.0%");
    expect(formatPercent(Infinity)).toBe("0.0%");
  });

  test("T2.3.5: formatBytes handles sub-byte fractional values and index underflow prevention", () => {
    expect(formatBytes(0.0001)).toBe("0 B");
    expect(formatBytes(0.4)).toBe("0 B");
    expect(formatBytes(0.5)).toBe("1 B");
    expect(formatBytes(0.6)).toBe("1 B");
    expect(formatBytes(0.999)).toBe("1 B");
    expect(formatBytes(0.000001)).toBe("0 B");
  });
});

describe("Tier 2 - Boundary: Missing Labels, Null Drive Letters & Mount Paths", () => {
  test("T2.4.1: Volume with empty or whitespace label falls back to Local Disk (Letter)", () => {
    expect(normalizeVolumeName("", "internal", "C:")).toBe("Local Disk (C:)");
    expect(normalizeVolumeName("   ", "internal", "D:")).toBe("Local Disk (D:)");
    expect(normalizeVolumeName(undefined, "removable", "E:")).toBe("Removable Disk (E:)");
  });

  test("T2.4.2: Drive with no drive letter formats displayName with mount point", () => {
    const raw = {
      mountPoint: "/Volumes/ExternalSSD",
      volumeName: "ExternalSSD",
      totalBytes: 500_000_000_000,
      freeBytes: 250_000_000_000,
      category: "removable" as const,
    };
    const drive = sanitizeDrive(raw);
    expect(drive.driveLetter).toBeUndefined();
    expect(drive.volumeName).toBe("ExternalSSD");
    expect(drive.displayName).toBe("ExternalSSD [/Volumes/ExternalSSD]");
    expect(drive.mountPoint).toBe("/Volumes/ExternalSSD");
  });

  test("T2.4.3: Windows Volume GUID path without letter is handled safely", () => {
    const guidPath = "\\\\?\\Volume{a8c430e7-0000-0000-0000-100000000000}\\";
    const raw = {
      mountPoint: guidPath,
      volumeName: "",
      totalBytes: 100_000_000_000,
      freeBytes: 80_000_000_000,
      category: "internal" as const,
    };
    const drive = sanitizeDrive(raw);
    expect(drive.driveLetter).toBeUndefined();
    expect(drive.volumeName).toBe("Local Disk");
    expect(drive.displayName).toBe(`Local Disk [${guidPath}]`);
  });

  test("T2.4.4: Drive letter provided as lower case 'c' or 'c:' is normalized to 'C:'", () => {
    const drive1 = sanitizeDrive({ driveLetter: "c", totalBytes: 1000 });
    expect(drive1.driveLetter).toBe("C:");
    expect(drive1.mountPoint).toBe("C:\\");

    const drive2 = sanitizeDrive({ driveLetter: "e:", totalBytes: 1000 });
    expect(drive2.driveLetter).toBe("E:");
  });
});

describe("Tier 2 - Boundary: Offline Shares, BitLocker & Optical Drives", () => {
  test("T2.5.1: Offline network share with 0 bytes remaining preserves share path and Unknown health", () => {
    const raw = {
      driveLetter: "Z:",
      networkPath: "\\\\nas.corp\\archive",
      totalBytes: 5_000_000_000_000,
      freeBytes: 0,
      usedBytes: 0,
      category: "network" as const,
      healthStatus: "Unknown",
    };
    const drive = sanitizeDrive(raw);
    expect(drive.category).toBe("network");
    expect(drive.networkPath).toBe("\\\\nas.corp\\archive");
    expect(drive.healthStatus).toBe("Unknown");
    expect(drive.isRemovable).toBe(false);
  });

  test("T2.5.2: BitLocker encrypted volume is marked isBitLockerEncrypted and isReadOnly", () => {
    const raw = {
      driveLetter: "F:",
      volumeName: "BitLocker Locked",
      isBitLockerEncrypted: true,
      isReadOnly: true,
      fileSystem: "BitLocker",
      totalBytes: 500_000_000_000,
      freeBytes: 0,
      healthStatus: "Unknown",
    };
    const drive = sanitizeDrive(raw);
    expect(drive.isBitLockerEncrypted).toBe(true);
    expect(drive.isReadOnly).toBe(true);
    expect(drive.fileSystem).toBe("BitLocker");
    expect(drive.healthStatus).toBe("Unknown");
  });

  test("T2.5.3: Optical drive with 0 totalBytes is classified as optical and read-only", () => {
    const raw = {
      driveLetter: "D:",
      category: "optical" as const,
      busType: "ATAPI",
      totalBytes: 0,
      freeBytes: 0,
      isReadOnly: true,
    };
    const drive = sanitizeDrive(raw);
    expect(drive.category).toBe("optical");
    expect(drive.totalBytes).toBe(0);
    expect(drive.isReadOnly).toBe(true);
    expect(drive.healthStatus).toBe("Unknown");
    expect(drive.driveTypeDescription).toBe("Optical CD/DVD Disc");
  });
});

describe("Tier 2 - Boundary: Unicode, Emojis & Shell Metacharacters", () => {
  test("T2.6.1: Volume name with emojis is preserved accurately", () => {
    const raw = {
      driveLetter: "H:",
      volumeName: "💾 Backup_2026 🚀",
      totalBytes: 2_000_000_000_000,
      freeBytes: 1_000_000_000_000,
      category: "removable" as const,
    };
    const drive = sanitizeDrive(raw);
    expect(drive.volumeName).toBe("💾 Backup_2026 🚀");
    expect(drive.displayName).toBe("💾 Backup_2026 🚀 (H:)");
  });

  test("T2.6.2: Asian multi-byte characters in volume label and mount path", () => {
    const raw = {
      mountPoint: "/Volumes/メインディスク",
      volumeName: "メインディスク",
      totalBytes: 1_000_000_000_000,
      freeBytes: 500_000_000_000,
      category: "internal" as const,
    };
    const drive = sanitizeDrive(raw);
    expect(drive.volumeName).toBe("メインディスク");
    expect(drive.displayName).toBe("メインディスク [/Volumes/メインディスク]");
  });

  test("T2.6.3: Volume names with quotes, ampersands, backslashes and special shell characters", () => {
    const specialName = `Volume & "Data" 'Folder' %TEMP% $PATH | <Test>`;
    const raw = {
      driveLetter: "X:",
      volumeName: specialName,
      totalBytes: 100_000_000_000,
      freeBytes: 50_000_000_000,
      category: "internal" as const,
    };
    const drive = sanitizeDrive(raw);
    expect(drive.volumeName).toBe(specialName);
    expect(drive.displayName).toBe(`${specialName} (X:)`);
  });
});
