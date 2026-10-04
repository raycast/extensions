import { describe, test, expect } from "./test-framework";
import {
  formatBytes,
  formatExactBytes,
  formatPercent,
} from "../src/utils/formatters";
import { renderSegmentMeter, renderHighResMeter } from "../src/utils/meters";
import {
  getUsageColor,
  getHealthColor,
  getCategoryIcon,
} from "../src/utils/colors";
import {
  sanitizeDrive,
  normalizeCategory,
  normalizeVolumeName,
  buildDisplayName,
  normalizeHealthStatus,
  normalizeMediaType,
  parseBytes,
  RawDriveInput,
} from "../src/utils/sanitizers";
import { calculateOverview } from "../src/services/storage-factory";
import { StorageDrive } from "../src/types/storage";

// Pure markdown generator mirror for verification
function generateTestDriveMarkdown(drive: StorageDrive): string {
  const gauge = renderHighResMeter(drive.usagePercent, 16);
  const colorWord =
    drive.usagePercent >= 90
      ? "🔴 Critical"
      : drive.usagePercent >= 85
        ? "🟠 Warning"
        : drive.usagePercent >= 70
          ? "🟡 Moderate"
          : "🟢 Normal";

  const lines = [
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
    drive.networkPath ? `- **Network Path**: ${drive.networkPath}` : "",
    drive.isBitLockerEncrypted ? "- **Security**: BitLocker Encrypted" : "",
    drive.isReadOnly ? "- **Access**: Read-Only Volume" : "",
    drive.isSystemDrive ? "- **Role**: System Boot Volume" : "",
  ].filter(Boolean);

  return lines.join("\n");
}

function getTestMenuBarTitle(primaryDrive?: StorageDrive): string {
  if (!primaryDrive) return "No Drives";
  const letter = primaryDrive.driveLetter || primaryDrive.displayName;
  const percent = Math.round(primaryDrive.usagePercent);
  if (primaryDrive.usagePercent >= 90) {
    return `⚠️ ${letter} ${percent}%`;
  }
  return `${letter} ${percent}%`;
}

describe("Adversarial Tier 5.1: Extreme Numeric Boundaries & Tolerances", () => {
  test("ADV-1.1: Zero capacities and sub-byte tolerance handling", () => {
    // 0 bytes
    expect(formatBytes(0)).toBe("0 B");
    expect(formatExactBytes(0)).toBe("0 B");
    expect(formatPercent(0)).toBe("0.0%");

    // Negative values
    expect(formatBytes(-1)).toBe("0 B");
    expect(formatBytes(-1048576)).toBe("0 B");
    expect(formatExactBytes(-500)).toBe("0 B");
    expect(formatPercent(-10)).toBe("0.0%");

    // Sub-byte fractional values
    expect(formatBytes(0.0001)).toBe("0 B");
    expect(formatBytes(0.4)).toBe("0 B");
    expect(formatBytes(0.6)).toBe("1 B");
    expect(formatExactBytes(0.4)).toBe("0 B");
    expect(formatExactBytes(0.6)).toBe("1 B");

    // Sub-unit transitions
    expect(formatBytes(1023.999)).toBe("1024 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024 - 0.5)).toBe("1.0 MB");
    expect(formatBytes(1024 * 1024 * 1024 - 1)).toBe("1.0 GB");
  });

  test("ADV-1.2: Extreme Integer & Exabyte / Petabyte Scaling", () => {
    const ONE_KB = 1024;
    const ONE_MB = 1024 * ONE_KB;
    const ONE_GB = 1024 * ONE_MB;
    const ONE_TB = 1024 * ONE_GB;
    const ONE_PB = 1024 * ONE_TB;
    const ONE_EB = 1024 * ONE_PB;

    expect(formatBytes(ONE_TB)).toBe("1.0 TB");
    expect(formatBytes(500 * ONE_TB)).toBe("500.0 TB");
    expect(formatBytes(ONE_PB)).toBe("1.0 PB");
    expect(formatBytes(250 * ONE_PB)).toBe("250.0 PB");
    expect(formatBytes(ONE_EB)).toBe("1.0 EB");
    expect(formatBytes(100 * ONE_EB)).toBe("100.0 EB");

    // JavaScript Number.MAX_SAFE_INTEGER (~8 PB)
    expect(formatBytes(Number.MAX_SAFE_INTEGER)).toBe("8.0 PB");
    expect(formatExactBytes(Number.MAX_SAFE_INTEGER)).toBe(
      `${Number.MAX_SAFE_INTEGER.toLocaleString("en-US")} B`,
    );

    // Scaling beyond EB (Zettabytes / Yottabytes should not crash or produce out-of-bounds index)
    const superLarge = Math.pow(1024, 7); // 1 ZB
    expect(formatBytes(superLarge)).toBe("1024.0 EB");

    const maxVal = 1e30;
    expect(formatBytes(maxVal)).toBe(
      `${(maxVal / Math.pow(1024, 6)).toFixed(1)} EB`,
    );
  });

  test("ADV-1.3: NaN, Infinity, -Infinity and String Ingestion in parseBytes", () => {
    expect(parseBytes(NaN)).toBe(0);
    expect(parseBytes(Infinity)).toBe(0);
    expect(parseBytes(-Infinity)).toBe(0);
    expect(parseBytes(undefined)).toBe(0);
    expect(parseBytes(null as any)).toBe(0);
    expect(parseBytes("")).toBe(0);
    expect(parseBytes("   ")).toBe(0);
    expect(parseBytes("\t\n\r")).toBe(0);
    expect(parseBytes("NaN")).toBe(0);
    expect(parseBytes("Infinity")).toBe(0);
    expect(parseBytes("-100")).toBe(0);
    expect(parseBytes("not-a-number")).toBe(0);
    expect(parseBytes("[object Object]")).toBe(0);
    expect(parseBytes("{ 'bytes': 100 }")).toBe(0);
    expect(parseBytes("100GB")).toBe(0); // Non-numeric suffix causes Number("100GB") = NaN -> 0

    // Valid numeric strings
    expect(parseBytes("1073741824")).toBe(1073741824);
    expect(parseBytes("  536870912  ")).toBe(536870912);
    expect(parseBytes("1.5e9")).toBe(1500000000);
    expect(parseBytes("0x100")).toBe(256);
  });

  test("ADV-1.4: Inverted capacities & over-saturation resilience in sanitizeDrive", () => {
    // Over-saturation: usedBytes > totalBytes (e.g. disk overcommit or virtual disk growth)
    const overCommit = sanitizeDrive({
      driveLetter: "E:",
      totalBytes: 100_000_000_000,
      usedBytes: 150_000_000_000,
      freeBytes: 0,
    });
    expect(overCommit.totalBytes).toBe(100_000_000_000);
    expect(overCommit.usedBytes).toBe(150_000_000_000);
    expect(overCommit.usagePercent).toBe(100.0); // Clamped to 100%
    expect(overCommit.healthStatus).toBe("Critical");

    // Inverted: freeBytes > totalBytes
    const invertedFree = sanitizeDrive({
      driveLetter: "F:",
      totalBytes: 100_000_000_000,
      freeBytes: 150_000_000_000,
      usedBytes: 0,
    });
    expect(invertedFree.usagePercent).toBe(0.0);
    expect(invertedFree.healthStatus).toBe("Healthy");

    // Total = 0, Used = 0, Free = 0 (Optical or disconnected)
    const zeroDrive = sanitizeDrive({
      driveLetter: "D:",
      totalBytes: 0,
      freeBytes: 0,
      usedBytes: 0,
      category: "optical",
    });
    expect(zeroDrive.usagePercent).toBe(0);
    expect(zeroDrive.healthStatus).toBe("Unknown");
    expect(renderSegmentMeter(zeroDrive.usagePercent)).toBe("▱▱▱▱▱▱▱▱▱▱");
  });
});

describe("Adversarial Tier 5.2: Threshold Transition Edges & Gauge Sub-Block Invariants", () => {
  test("ADV-2.1: Exhaustive Color Threshold Transition Stepping", () => {
    // SecondaryText for invalid / negative
    expect(getUsageColor(-100)).toBe("raycast-color-secondary");
    expect(getUsageColor(-0.001)).toBe("raycast-color-secondary");
    expect(getUsageColor(NaN)).toBe("raycast-color-secondary");

    // Green: [0, 70)
    expect(getUsageColor(0)).toBe("raycast-color-green");
    expect(getUsageColor(0.0001)).toBe("raycast-color-green");
    expect(getUsageColor(35.5)).toBe("raycast-color-green");
    expect(getUsageColor(69.9)).toBe("raycast-color-green");
    expect(getUsageColor(69.99)).toBe("raycast-color-green");
    expect(getUsageColor(69.999999)).toBe("raycast-color-green");

    // Yellow: [70, 85)
    expect(getUsageColor(70.0)).toBe("raycast-color-yellow");
    expect(getUsageColor(70.000001)).toBe("raycast-color-yellow");
    expect(getUsageColor(77.7)).toBe("raycast-color-yellow");
    expect(getUsageColor(84.9)).toBe("raycast-color-yellow");
    expect(getUsageColor(84.99)).toBe("raycast-color-yellow");
    expect(getUsageColor(84.999999)).toBe("raycast-color-yellow");

    // Orange: [85, 90)
    expect(getUsageColor(85.0)).toBe("raycast-color-orange");
    expect(getUsageColor(85.000001)).toBe("raycast-color-orange");
    expect(getUsageColor(87.5)).toBe("raycast-color-orange");
    expect(getUsageColor(89.9)).toBe("raycast-color-orange");
    expect(getUsageColor(89.99)).toBe("raycast-color-orange");
    expect(getUsageColor(89.999999)).toBe("raycast-color-orange");

    // Red: [90, infinity)
    expect(getUsageColor(90.0)).toBe("raycast-color-red");
    expect(getUsageColor(90.000001)).toBe("raycast-color-red");
    expect(getUsageColor(95.0)).toBe("raycast-color-red");
    expect(getUsageColor(100.0)).toBe("raycast-color-red");
    expect(getUsageColor(150.0)).toBe("raycast-color-red");
  });

  test("ADV-2.2: 10-Segment Unicode Meter Exact Mathematical Transitions", () => {
    // 10 Segments: step is 10%, rounding threshold is 5%
    const cases: Array<{ percent: number; expectedFilled: number }> = [
      { percent: -10, expectedFilled: 0 },
      { percent: 0, expectedFilled: 0 },
      { percent: 4.99, expectedFilled: 0 },
      { percent: 5.0, expectedFilled: 1 },
      { percent: 14.99, expectedFilled: 1 },
      { percent: 15.0, expectedFilled: 2 },
      { percent: 24.99, expectedFilled: 2 },
      { percent: 25.0, expectedFilled: 3 },
      { percent: 34.99, expectedFilled: 3 },
      { percent: 35.0, expectedFilled: 4 },
      { percent: 44.99, expectedFilled: 4 },
      { percent: 45.0, expectedFilled: 5 },
      { percent: 54.99, expectedFilled: 5 },
      { percent: 55.0, expectedFilled: 6 },
      { percent: 64.99, expectedFilled: 6 },
      { percent: 65.0, expectedFilled: 7 },
      { percent: 74.99, expectedFilled: 7 },
      { percent: 75.0, expectedFilled: 8 },
      { percent: 84.99, expectedFilled: 8 },
      { percent: 85.0, expectedFilled: 9 },
      { percent: 94.99, expectedFilled: 9 },
      { percent: 95.0, expectedFilled: 10 },
      { percent: 100.0, expectedFilled: 10 },
      { percent: 120.0, expectedFilled: 10 },
    ];

    for (const c of cases) {
      const rendered = renderSegmentMeter(c.percent, 10, "▰", "▱");
      expect(rendered.length).toBe(10);
      const filledChars = (rendered.match(/▰/g) || []).length;
      const emptyChars = (rendered.match(/▱/g) || []).length;
      expect(filledChars).toBe(c.expectedFilled);
      expect(emptyChars).toBe(10 - c.expectedFilled);
    }

    // Zero or negative segment count handling
    expect(renderSegmentMeter(50, 0)).toBe("");
    expect(renderSegmentMeter(50, -5)).toBe("");
    expect(renderSegmentMeter(NaN, 10)).toBe("▱▱▱▱▱▱▱▱▱▱");
  });

  test("ADV-2.3: 16-Segment High-Res Gauge Sub-Block Invariants", () => {
    // 16 Segments: step is 6.25%, rounding threshold is 3.125%
    const cases: Array<{ percent: number; expectedFilled: number }> = [
      { percent: 0, expectedFilled: 0 },
      { percent: 3.12, expectedFilled: 0 },
      { percent: 3.13, expectedFilled: 1 },
      { percent: 9.37, expectedFilled: 1 },
      { percent: 9.38, expectedFilled: 2 },
      { percent: 50.0, expectedFilled: 8 },
      { percent: 96.87, expectedFilled: 15 },
      { percent: 96.88, expectedFilled: 16 },
      { percent: 100.0, expectedFilled: 16 },
    ];

    for (const c of cases) {
      const rendered = renderHighResMeter(c.percent, 16);
      expect(rendered.length).toBe(16);
      const filled = (rendered.match(/█/g) || []).length;
      const empty = (rendered.match(/░/g) || []).length;
      expect(filled).toBe(c.expectedFilled);
      expect(empty).toBe(16 - c.expectedFilled);
    }
  });

  test("ADV-2.4: Health Status Normalization State Machine", () => {
    // Reported "Healthy" with low space should be automatically downgraded
    expect(normalizeHealthStatus("Healthy", 50, 1000)).toBe("Healthy");
    expect(normalizeHealthStatus("OK", 84.9, 1000)).toBe("Healthy");
    expect(normalizeHealthStatus("0", 85.0, 1000)).toBe("Warning");
    expect(normalizeHealthStatus("Good", 89.9, 1000)).toBe("Warning");
    expect(normalizeHealthStatus("Healthy", 90.0, 1000)).toBe("Critical");

    // Reported "Warning" stays Warning even if usage is low
    expect(normalizeHealthStatus("Warning", 10, 1000)).toBe("Warning");
    expect(normalizeHealthStatus("Degraded", 0, 1000)).toBe("Warning");
    expect(normalizeHealthStatus("Pred Fail", 5, 1000)).toBe("Warning");

    // Reported "Critical" stays Critical
    expect(normalizeHealthStatus("Critical", 5, 1000)).toBe("Critical");
    expect(normalizeHealthStatus("Failed", 0, 1000)).toBe("Critical");
    expect(normalizeHealthStatus("Bad", 10, 1000)).toBe("Critical");

    // Unrecognized strings
    expect(normalizeHealthStatus("MysteriousStatus", 50, 1000)).toBe("Unknown");

    // Undefined status with 0 bytes vs active bytes
    expect(normalizeHealthStatus(undefined, 0, 0)).toBe("Unknown");
    expect(normalizeHealthStatus(undefined, 60, 1000)).toBe("Healthy");
    expect(normalizeHealthStatus(undefined, 86, 1000)).toBe("Warning");
    expect(normalizeHealthStatus(undefined, 92, 1000)).toBe("Critical");
  });
});

describe("Adversarial Tier 5.3: Unicode, Internationalization & Injection Resilience", () => {
  test("ADV-3.1: Multilingual CJK, RTL, and Special Unicode Scripts", () => {
    const testDrives: Array<{
      input: RawDriveInput;
      expectedVolume: string;
      expectedDisplay: string;
    }> = [
      {
        input: {
          driveLetter: "J:",
          volumeName: "超高速外部SSD (東京第２データセンター)",
          category: "removable",
        },
        expectedVolume: "超高速外部SSD (東京第２データセンター)",
        expectedDisplay: "超高速外部SSD (東京第２データセンター) (J:)",
      },
      {
        input: {
          driveLetter: "K:",
          volumeName: "백업용 외장 드라이브 (2026)",
          category: "removable",
        },
        expectedVolume: "백업용 외장 드라이브 (2026)",
        expectedDisplay: "백업용 외장 드라이브 (2026) (K:)",
      },
      {
        input: {
          driveLetter: "L:",
          volumeName: "قرص التخزين الرئيسي",
          category: "internal",
        },
        expectedVolume: "قرص التخزين الرئيسي",
        expectedDisplay: "قرص التخزين الرئيسي (L:)",
      },
      {
        input: {
          driveLetter: "M:",
          volumeName: "Dísque Réseau éàüñ",
          category: "network",
        },
        expectedVolume: "Dísque Réseau éàüñ",
        expectedDisplay: "Dísque Réseau éàüñ (M:)",
      },
      {
        input: {
          driveLetter: "N:",
          volumeName: "💾 SSD ⚡ Pro 2TB 🚀 👨‍💻",
          category: "internal",
        },
        expectedVolume: "💾 SSD ⚡ Pro 2TB 🚀 👨‍💻",
        expectedDisplay: "💾 SSD ⚡ Pro 2TB 🚀 👨‍💻 (N:)",
      },
    ];

    for (const item of testDrives) {
      const drive = sanitizeDrive(item.input);
      expect(drive.volumeName).toBe(item.expectedVolume);
      expect(drive.displayName).toBe(item.expectedDisplay);
    }
  });

  test("ADV-3.2: Shell Meta-Characters & Injection Payload Neutrality", () => {
    const maliciousInputs: string[] = [
      '"; rm -rf /; echo pwned"',
      "& calc.exe &",
      '| powershell -c "Start-Process calc"',
      "$(whoami)",
      "`whoami`",
      "$env:USERPROFILE\\test",
      "&& dir C:\\",
      "<script>alert(1)</script>",
      "[Markdown Link](http://malicious.site)",
      "Drive \u0000 with null byte",
    ];

    for (const payload of maliciousInputs) {
      const drive = sanitizeDrive({
        driveLetter: "X:",
        volumeName: payload,
        mountPoint: `C:\\mount\\${payload}`,
        category: "internal",
        totalBytes: 1_000_000,
        freeBytes: 500_000,
      });

      // Assert that sanitizeDrive did not throw and accurately preserved raw string without evaluation
      expect(drive.volumeName).toBe(payload);
      expect(drive.displayName).toBe(`${payload} (X:)`);

      // Verify generateTestDriveMarkdown safely encapsulates the payload
      const markdown = generateTestDriveMarkdown(drive);
      expect(markdown).toContain(payload);
      expect(typeof markdown).toBe("string");
    }
  });

  test("ADV-3.3: Volume Name Redundancy Protection", () => {
    // If volume name already contains (D:), displayName should NOT duplicate it to Data (D:) (D:)
    const drive1 = sanitizeDrive({
      driveLetter: "D:",
      volumeName: "Data (D:)",
      category: "internal",
    });
    expect(drive1.displayName).toBe("Data (D:)");

    // Empty volume name fallback with drive letter
    const drive2 = sanitizeDrive({
      driveLetter: "E:",
      volumeName: "   ",
      category: "removable",
    });
    expect(drive2.volumeName).toBe("Removable Disk (E:)");
    expect(drive2.displayName).toBe("Removable Disk (E:)");
  });
});

describe("Adversarial Tier 5.4: Multi-Drive Permutation Invariance & Primary Drive Election", () => {
  const masterDriveSet: StorageDrive[] = [
    sanitizeDrive({
      id: "drive-C",
      driveLetter: "C:",
      mountPoint: "C:\\",
      volumeName: "Windows Boot",
      category: "internal",
      isSystemDrive: true,
      totalBytes: 1_000_000_000_000,
      usedBytes: 600_000_000_000,
      freeBytes: 400_000_000_000,
      healthStatus: "Healthy",
    }),
    sanitizeDrive({
      id: "drive-D",
      driveLetter: "D:",
      mountPoint: "D:\\",
      volumeName: "Secondary Data",
      category: "internal",
      isSystemDrive: false,
      totalBytes: 2_000_000_000_000,
      usedBytes: 1_800_000_000_000,
      freeBytes: 200_000_000_000,
      healthStatus: "Warning",
    }),
    sanitizeDrive({
      id: "drive-E",
      driveLetter: "E:",
      mountPoint: "E:\\",
      volumeName: "Flash Drive",
      category: "removable",
      isRemovable: true,
      isSystemDrive: false,
      totalBytes: 64_000_000_000,
      usedBytes: 60_000_000_000,
      freeBytes: 4_000_000_000,
      healthStatus: "Critical",
    }),
    sanitizeDrive({
      id: "drive-Z",
      driveLetter: "Z:",
      mountPoint: "Z:\\",
      volumeName: "NAS Storage",
      category: "network",
      networkPath: "\\\\nas.local\\share",
      isSystemDrive: false,
      totalBytes: 10_000_000_000_000,
      usedBytes: 5_000_000_000_000,
      freeBytes: 5_000_000_000_000,
      healthStatus: "Healthy",
    }),
    sanitizeDrive({
      id: "drive-G",
      driveLetter: "G:",
      mountPoint: "G:\\",
      volumeName: "DVD Drive",
      category: "optical",
      isSystemDrive: false,
      totalBytes: 0,
      usedBytes: 0,
      freeBytes: 0,
      healthStatus: "Unknown",
    }),
  ];

  test("ADV-4.1: Random Permutation Invariance Oracle (50 shuffles)", () => {
    // Reference overview from canonical order
    const referenceOverview = calculateOverview(masterDriveSet);
    expect(referenceOverview.totalDrives).toBe(5);
    expect(referenceOverview.totalBytes).toBe(13_064_000_000_000);
    expect(referenceOverview.totalUsedBytes).toBe(7_460_000_000_000);
    expect(referenceOverview.totalFreeBytes).toBe(5_604_000_000_000);
    expect(referenceOverview.healthyCount).toBe(2);
    expect(referenceOverview.warningCount).toBe(1);
    expect(referenceOverview.criticalCount).toBe(1);
    expect(referenceOverview.primaryDrive?.id).toBe("drive-C");

    // Shuffle and test 50 times
    for (let i = 0; i < 50; i++) {
      const shuffled = [...masterDriveSet].sort(() => Math.random() - 0.5);
      const overview = calculateOverview(shuffled);

      expect(overview.totalDrives).toBe(referenceOverview.totalDrives);
      expect(overview.totalBytes).toBe(referenceOverview.totalBytes);
      expect(overview.totalUsedBytes).toBe(referenceOverview.totalUsedBytes);
      expect(overview.totalFreeBytes).toBe(referenceOverview.totalFreeBytes);
      expect(overview.overallUsagePercent).toBe(
        referenceOverview.overallUsagePercent,
      );
      expect(overview.healthyCount).toBe(referenceOverview.healthyCount);
      expect(overview.warningCount).toBe(referenceOverview.warningCount);
      expect(overview.criticalCount).toBe(referenceOverview.criticalCount);
      expect(overview.primaryDrive?.id).toBe("drive-C");
    }
  });

  test("ADV-4.2: Primary Drive Election Fallback When No System Drive Exists", () => {
    const nonSystemDrives: StorageDrive[] = [
      sanitizeDrive({
        id: "drive-D",
        driveLetter: "D:",
        isSystemDrive: false,
        totalBytes: 1000,
        usedBytes: 500,
      }),
      sanitizeDrive({
        id: "drive-E",
        driveLetter: "E:",
        isSystemDrive: false,
        totalBytes: 2000,
        usedBytes: 1000,
      }),
    ];

    const overview = calculateOverview(nonSystemDrives);
    expect(overview.primaryDrive?.id).toBe("drive-D");
  });

  test("ADV-4.3: Overview Aggregation for Empty Drive Collection", () => {
    const emptyOverview = calculateOverview([]);
    expect(emptyOverview.totalDrives).toBe(0);
    expect(emptyOverview.totalBytes).toBe(0);
    expect(emptyOverview.totalUsedBytes).toBe(0);
    expect(emptyOverview.totalFreeBytes).toBe(0);
    expect(emptyOverview.overallUsagePercent).toBe(0);
    expect(emptyOverview.healthyCount).toBe(0);
    expect(emptyOverview.warningCount).toBe(0);
    expect(emptyOverview.criticalCount).toBe(0);
    expect(emptyOverview.primaryDrive).toBeUndefined();
  });
});

describe("Adversarial Tier 5.5: Presentation Generators Stability (Markdown & MenuBar)", () => {
  test("ADV-5.1: generateTestDriveMarkdown handles sparse & edge-case drives cleanly", () => {
    const sparseDrive: StorageDrive = {
      id: "sparse-1",
      mountPoint: "X:\\",
      volumeName: "Bare Drive",
      displayName: "Bare Drive (X:)",
      driveLetter: "X:",
      category: "internal",
      driveTypeDescription: "Internal Volume",
      fileSystem: "NTFS",
      totalBytes: 0,
      usedBytes: 0,
      freeBytes: 0,
      usagePercent: 0,
      healthStatus: "Unknown",
      isReadOnly: false,
      isSystemDrive: false,
      isRemovable: false,
    };

    const markdown = generateTestDriveMarkdown(sparseDrive);
    expect(markdown).toContain("# Bare Drive (X:)");
    expect(markdown).toContain("`░░░░░░░░░░░░░░░░` **0.0%** (🟢 Normal)");
    expect(markdown).toContain("- **Used Space**: 0 B (0 B)");
    expect(markdown).toContain("- **Free Space**: 0 B (0 B)");
    expect(markdown).toContain("- **Total Capacity**: 0 B (0 B)");
    expect(markdown).toContain("- **Health Status**: Unknown");
    expect(markdown.includes("undefined")).toBe(false);
    expect(markdown.includes("NaN")).toBe(false);
    expect(markdown.includes("null")).toBe(false);
  });

  test("ADV-5.2: getTestMenuBarTitle accurately reflects status and critical warnings", () => {
    // No primary drive
    expect(getTestMenuBarTitle(undefined)).toBe("No Drives");

    // Normal drive
    const normalDrive = sanitizeDrive({
      driveLetter: "C:",
      totalBytes: 100_000,
      usedBytes: 45_000,
      freeBytes: 55_000,
    });
    expect(getTestMenuBarTitle(normalDrive)).toBe("C: 45%");

    // Critical drive (>= 90%)
    const criticalDrive = sanitizeDrive({
      driveLetter: "C:",
      totalBytes: 100_000,
      usedBytes: 94_800,
      freeBytes: 5_200,
    });
    expect(getTestMenuBarTitle(criticalDrive)).toBe("⚠️ C: 95%");

    // Drive with no driveLetter (e.g. Mac mount)
    const macDrive = sanitizeDrive({
      mountPoint: "/Volumes/Macintosh HD",
      volumeName: "Macintosh HD",
      totalBytes: 500_000_000,
      usedBytes: 350_000_000,
      category: "internal",
    });
    expect(getTestMenuBarTitle(macDrive)).toBe(
      "Macintosh HD [/Volumes/Macintosh HD] 70%",
    );
  });

  test("ADV-5.3: Live Windows Storage Provider Query Invariants (Host OS)", async () => {
    if (process.platform === "win32") {
      const { WindowsStorageProvider } = await import(
        "../src/services/windows-provider"
      );
      const provider = new WindowsStorageProvider();
      const drives = await provider.getDrives();
      expect(drives.length).toBeGreaterThan(0);

      // System drive must exist and have valid metrics
      const systemDrive = drives.find((d) => d.isSystemDrive);
      expect(systemDrive).toBeDefined();
      expect(systemDrive?.driveLetter).toBe("C:");
      expect(systemDrive?.totalBytes).toBeGreaterThan(1_000_000_000);
      expect(systemDrive?.freeBytes).toBeGreaterThan(0);
      expect(systemDrive?.usedBytes).toBeGreaterThan(0);
      expect(systemDrive?.healthStatus).toBeDefined();

      // Overview integrity
      const overview = await provider.getOverview();
      expect(overview.totalDrives).toBe(drives.length);
      expect(overview.totalBytes).toBeGreaterThan(0);
      expect(overview.primaryDrive?.driveLetter).toBe("C:");
      expect(overview.healthyCount + overview.warningCount + overview.criticalCount).toBe(
        overview.totalDrives,
      );
    }
  });
});
