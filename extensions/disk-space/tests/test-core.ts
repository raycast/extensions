import Module from "module";
import * as mockRaycast from "./mock-raycast-api";

// Hook require to intercept @raycast/api for standalone testing
const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (path: string) {
  if (path === "@raycast/api") {
    return mockRaycast;
  }
  return originalRequire.apply(this, arguments);
};

import assert from "assert";
import {
  formatBytes,
  formatExactBytes,
  formatPercent,
  renderSegmentMeter,
  renderHighResMeter,
  getUsageColor,
  getHealthColor,
  getCategoryIcon,
  sanitizeDrive,
  MockStorageProvider,
  getStorageProvider,
  calculateOverview,
  DEFAULT_MOCK_DRIVES,
} from "../src/index";
import { Color, Icon } from "./mock-raycast-api";

console.log("=== RUNNING TRACK B CORE ENGINE VALIDATION ===");

// 1. Test Formatters
console.log("1. Testing Formatters...");
assert.strictEqual(formatBytes(0), "0 B");
assert.strictEqual(formatBytes(-100), "0 B");
assert.strictEqual(formatBytes(NaN), "0 B");
assert.strictEqual(formatBytes(500), "500 B");
assert.strictEqual(formatBytes(1024), "1.0 KB");
assert.strictEqual(formatBytes(1024 * 1024), "1.0 MB");
assert.strictEqual(formatBytes(1024 * 1024 * 1024), "1.0 GB");
assert.strictEqual(formatBytes(1.5 * 1024 * 1024 * 1024 * 1024), "1.5 TB");

assert.strictEqual(formatExactBytes(0), "0 B");
assert.strictEqual(formatExactBytes(1073741824), "1,073,741,824 B");
assert.strictEqual(formatExactBytes(-50), "0 B");

assert.strictEqual(formatPercent(0), "0.0%");
assert.strictEqual(formatPercent(74.24), "74.2%");
assert.strictEqual(formatPercent(100), "100.0%");
assert.strictEqual(formatPercent(-5), "0.0%");
assert.strictEqual(formatPercent(120), "100.0%");
console.log("✓ Formatters passed.");

// 2. Test Meters
console.log("2. Testing Capacity Meters...");
assert.strictEqual(renderSegmentMeter(0, 10), "▱▱▱▱▱▱▱▱▱▱");
assert.strictEqual(renderSegmentMeter(50, 10), "▰▰▰▰▰▱▱▱▱▱");
assert.strictEqual(renderSegmentMeter(100, 10), "▰▰▰▰▰▰▰▰▰▰");
assert.strictEqual(renderSegmentMeter(75, 8), "▰▰▰▰▰▰▱▱");

assert.strictEqual(renderHighResMeter(0, 16), "░░░░░░░░░░░░░░░░");
assert.strictEqual(renderHighResMeter(50, 16), "████████░░░░░░░░");
assert.strictEqual(renderHighResMeter(100, 16), "████████████████");
console.log("✓ Meters passed.");

// 3. Test Colors & Icons
console.log("3. Testing Colors & Icons...");
assert.strictEqual(getUsageColor(45), Color.Green);
assert.strictEqual(getUsageColor(69.9), Color.Green);
assert.strictEqual(getUsageColor(70.0), Color.Yellow);
assert.strictEqual(getUsageColor(84.9), Color.Yellow);
assert.strictEqual(getUsageColor(85.0), Color.Orange);
assert.strictEqual(getUsageColor(89.9), Color.Orange);
assert.strictEqual(getUsageColor(90.0), Color.Red);
assert.strictEqual(getUsageColor(99.9), Color.Red);

assert.strictEqual(getHealthColor("Healthy"), Color.Green);
assert.strictEqual(getHealthColor("Warning"), Color.Orange);
assert.strictEqual(getHealthColor("Critical"), Color.Red);
assert.strictEqual(getHealthColor("Unknown"), Color.SecondaryText);

assert.strictEqual(getCategoryIcon("internal"), Icon.HardDrive);
assert.strictEqual(getCategoryIcon("removable"), Icon.MemoryStick);
assert.strictEqual(getCategoryIcon("network"), Icon.Network);
assert.strictEqual(getCategoryIcon("virtual"), Icon.Cd);
assert.strictEqual(getCategoryIcon("optical"), Icon.Cd);
console.log("✓ Colors & Icons passed.");

// 4. Test Sanitizers & Edge Cases
console.log("4. Testing Sanitizers & Edge Cases...");
// Edge Case A: Unlabeled Drive
const sanitizedA = sanitizeDrive({
  driveLetter: "D",
  mountPoint: "D:\\",
  totalBytes: 500000000,
  freeBytes: 250000000,
});
assert.strictEqual(sanitizedA.driveLetter, "D:");
assert.strictEqual(sanitizedA.volumeName, "Local Disk (D:)");
assert.strictEqual(sanitizedA.displayName, "Local Disk (D:)");
assert.strictEqual(sanitizedA.category, "internal");
assert.strictEqual(sanitizedA.usedBytes, 250000000);
assert.strictEqual(sanitizedA.usagePercent, 50.0);
assert.strictEqual(sanitizedA.healthStatus, "Healthy");

// Edge Case B: 0-Byte Optical Media
const sanitizedB = sanitizeDrive({
  driveLetter: "E:",
  category: "optical",
  totalBytes: 0,
  freeBytes: 0,
  usedBytes: 0,
});
assert.strictEqual(sanitizedB.totalBytes, 0);
assert.strictEqual(sanitizedB.usagePercent, 0);
assert.strictEqual(sanitizedB.healthStatus, "Unknown");
assert.strictEqual(sanitizedB.category, "optical");

// Edge Case C: Offline Network Share
const sanitizedC = sanitizeDrive({
  networkPath: "\\\\fileserver\\backup",
  totalBytes: 0,
  freeBytes: 0,
  healthStatus: "Warning",
});
assert.strictEqual(sanitizedC.category, "network");
assert.strictEqual(sanitizedC.healthStatus, "Warning");
assert.strictEqual(sanitizedC.isReadOnly, false);

// Edge Case D: BitLocker Encrypted Removable USB Drive
const sanitizedD = sanitizeDrive({
  driveLetter: "F:",
  category: "removable",
  isBitLockerEncrypted: true,
  busType: "USB",
  mediaType: "SSD",
  totalBytes: 64000000000,
  freeBytes: 32000000000,
});
assert.strictEqual(sanitizedD.isBitLockerEncrypted, true);
assert.strictEqual(sanitizedD.isRemovable, true);
assert.strictEqual(sanitizedD.category, "removable");
assert.strictEqual(sanitizedD.mediaType, "SSD");
console.log("✓ Sanitizers passed.");

// 5. Test Mock Provider & Overview Calculation
console.log("5. Testing Mock Provider & Overview...");
async function runAsyncTests() {
  const mockProvider = new MockStorageProvider();
  const drives = await mockProvider.getDrives();
  assert.strictEqual(drives.length, DEFAULT_MOCK_DRIVES.length);
  const overview = await mockProvider.getOverview();
  assert.strictEqual(overview.totalDrives, DEFAULT_MOCK_DRIVES.length);
  assert.ok(overview.totalBytes > 0);
  assert.ok(overview.totalUsedBytes > 0);
  assert.ok(overview.overallUsagePercent > 0);
  assert.strictEqual(overview.primaryDrive?.driveLetter, "C:");

  // Test Eject on Mock
  const removable = drives.find((d) => d.category === "removable")!;
  const ejected = await mockProvider.ejectDrive(removable);
  assert.strictEqual(ejected, true);
  const updatedDrives = await mockProvider.getDrives();
  assert.strictEqual(updatedDrives.length, DEFAULT_MOCK_DRIVES.length - 1);

  console.log("✓ Mock Provider & Overview passed.");
  console.log("=== ALL TRACK B CORE ENGINE VALIDATIONS PASSED ===");
}

runAsyncTests().catch((err) => {
  console.error("Async test failed:", err);
  process.exit(1);
});
