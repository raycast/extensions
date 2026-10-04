import Module from "module";
import * as mockRaycast from "./mock-raycast-api";

// Hook require to intercept @raycast/api
const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (path: string) {
  if (path === "@raycast/api") {
    return mockRaycast;
  }
  return originalRequire.apply(this, arguments);
};

import { formatBytes, formatExactBytes, formatPercent } from "../src/utils/formatters";
import { renderSegmentMeter, renderHighResMeter } from "../src/utils/meters";
import { getUsageColor, getHealthColor, getCategoryIcon } from "../src/utils/colors";
import { sanitizeDrive, parseBytes } from "../src/utils/sanitizers";
import { calculateOverview } from "../src/services/storage-factory";
import { StorageDrive } from "../src/types/storage";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed++;
  } else {
    passed++;
  }
}

console.log("=== RUNNING DEEP ADVERSARIAL STRESS HARNESS (FINAL CHALLENGER) ===");

// 1. Sub-byte fractional byte testing
const subBytes = [
  { val: 0, expected: "0 B" },
  { val: 0.00000001, expected: "0 B" },
  { val: 0.0001, expected: "0 B" },
  { val: 0.4, expected: "0 B" },
  { val: 0.49999, expected: "0 B" },
  { val: 0.5, expected: "1 B" },
  { val: 0.9999, expected: "1 B" },
  { val: 1.0, expected: "1 B" },
  { val: 1.4, expected: "1 B" },
  { val: 1.5, expected: "2 B" },
  { val: 1023.4, expected: "1023 B" },
  { val: 1023.5, expected: "1024 B" },
  { val: 1024, expected: "1.0 KB" },
];

for (const { val, expected } of subBytes) {
  const res = formatBytes(val);
  assert(res === expected, `formatBytes(${val}) expected "${expected}", got "${res}"`);
}

// 2. Multi-decimal variations
assert(formatBytes(1536, 0) === "2 KB", `formatBytes(1536, 0) -> "2 KB", got "${formatBytes(1536, 0)}"`);
assert(formatBytes(1536, 2) === "1.50 KB", `formatBytes(1536, 2) -> "1.50 KB", got "${formatBytes(1536, 2)}"`);
assert(formatBytes(0.4, 3) === "0 B", `formatBytes(0.4, 3) -> "0 B", got "${formatBytes(0.4, 3)}"`);

// 3. Roll-over near boundary limits
const nearBoundaries = [
  { val: 1024 * 1024 - 0.5, expected: "1.0 MB" },
  { val: 1024 * 1024 - 100, expected: "1023.9 KB" },
  { val: 1024 * 1024 * 1024 - 1, expected: "1.0 GB" },
  { val: 1024 * 1024 * 1024 * 1024 - 1, expected: "1.0 TB" },
];

for (const { val, expected } of nearBoundaries) {
  const res = formatBytes(val);
  assert(res === expected, `formatBytes(${val}) expected "${expected}", got "${res}"`);
}

// 4. Extreme values & Invalids
const extremas = [
  { val: -1, expected: "0 B" },
  { val: -0.0001, expected: "0 B" },
  { val: -Infinity, expected: "0 B" },
  { val: Infinity, expected: "0 B" },
  { val: NaN, expected: "0 B" },
  { val: Math.pow(1024, 6), expected: "1.0 EB" },
  { val: Math.pow(1024, 7), expected: "1024.0 EB" },
  { val: Number.MAX_SAFE_INTEGER, expected: "8.0 PB" },
];

for (const { val, expected } of extremas) {
  const res = formatBytes(val);
  assert(res === expected, `formatBytes(${val}) expected "${expected}", got "${res}"`);
}

// 5. Meter continuity stress: test 1000 percentage points between -10% and 110%
for (let p = -10; p <= 110; p += 0.12) {
  const meter10 = renderSegmentMeter(p, 10);
  assert(meter10.length === 10, `renderSegmentMeter(${p}) length should be 10, got ${meter10.length}`);
  assert(!meter10.includes("undefined"), `renderSegmentMeter(${p}) must not contain undefined`);

  const meter16 = renderHighResMeter(p, 16);
  assert(meter16.length === 16, `renderHighResMeter(${p}) length should be 16, got ${meter16.length}`);
  assert(!meter16.includes("undefined"), `renderHighResMeter(${p}) must not contain undefined`);

  const color = getUsageColor(p);
  assert(typeof color === "string" && color.startsWith("raycast-color-"), `getUsageColor(${p}) invalid color token: ${color}`);
}

// 6. Sanitizer robustness against 10,000 synthetic corrupt drives
const syntheticDrives: StorageDrive[] = [];
for (let i = 0; i < 10000; i++) {
  const raw = {
    id: `synthetic-${i}`,
    driveLetter: i % 3 === 0 ? String.fromCharCode(65 + (i % 26)) : undefined,
    mountPoint: i % 2 === 0 ? `\\\\?\\Volume{${i}}\\` : `/mnt/drive_${i}`,
    volumeName: i % 4 === 0 ? `   ` : i % 5 === 0 ? `Volume_🔥_${i}` : undefined,
    totalBytes: (i * 1024 * 1024 * 100) % 10_000_000_000_000,
    usedBytes: (i * 1024 * 1024 * 60) % 10_000_000_000_000,
    freeBytes: (i * 1024 * 1024 * 40) % 10_000_000_000_000,
    category: (["internal", "removable", "network", "virtual", "optical", "unknown"] as const)[i % 6],
    isSystemDrive: i === 0,
  };
  const sanitized = sanitizeDrive(raw as any);
  assert(sanitized.displayName.length > 0, `DisplayName empty for item ${i}`);
  assert(!sanitized.displayName.includes("undefined"), `DisplayName contains undefined for item ${i}`);
  assert(sanitized.usagePercent >= 0 && sanitized.usagePercent <= 100, `Usage percent out of range for item ${i}`);
  syntheticDrives.push(sanitized);
}

// 7. Aggregation performance on 10,000 drives
const aggStart = Date.now();
const overview = calculateOverview(syntheticDrives);
const aggDuration = Date.now() - aggStart;

assert(overview.totalDrives === 10000, `Overview drive count mismatch: ${overview.totalDrives}`);
assert(overview.totalBytes > 0, `Overview total bytes should be > 0`);
assert(overview.overallUsagePercent >= 0 && overview.overallUsagePercent <= 100, `Overview percent invalid`);
assert(overview.primaryDrive?.id === "synthetic-0", `Primary drive election failed`);
assert(aggDuration < 100, `Aggregation of 10,000 drives took too long: ${aggDuration}ms`);

console.log(`\n=== STRESS HARNESS SUMMARY ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`10,000 Drive Aggregation Duration: ${aggDuration}ms`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("✅ ALL ADVERSARIAL STRESS INVARIANTS SATISFIED.");
  process.exit(0);
}
