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

import { WindowsStorageProvider } from "../src/services/windows-provider";
import { formatBytes, formatPercent } from "../src/utils/formatters";
import { renderSegmentMeter } from "../src/utils/meters";

async function main() {
  console.log("=== TESTING LIVE WINDOWS STORAGE PROVIDER ===");
  const provider = new WindowsStorageProvider();
  const startTime = Date.now();
  const drives = await provider.getDrives();
  const elapsed = Date.now() - startTime;

  console.log(`Retrieved ${drives.length} drives in ${elapsed}ms:`);
  for (const drive of drives) {
    const meter = renderSegmentMeter(drive.usagePercent, 10);
    console.log(`- [${drive.driveLetter || drive.mountPoint}] ${drive.displayName} (${drive.driveTypeDescription})`);
    console.log(`  FS: ${drive.fileSystem} | Total: ${formatBytes(drive.totalBytes)} | Free: ${formatBytes(drive.freeBytes)} (${formatPercent(drive.usagePercent)} used)`);
    console.log(`  Gauge: ${meter} | Health: ${drive.healthStatus} | System: ${drive.isSystemDrive} | ReadOnly: ${drive.isReadOnly}`);
  }

  const overview = await provider.getOverview();
  console.log("\nOverview Summary:");
  console.log(`- Total Drives: ${overview.totalDrives}`);
  console.log(`- Total Storage: ${formatBytes(overview.totalBytes)} (Used: ${formatBytes(overview.totalUsedBytes)}, Free: ${formatBytes(overview.totalFreeBytes)})`);
  console.log(`- Overall Usage: ${formatPercent(overview.overallUsagePercent)}`);
  console.log(`- Primary Drive: ${overview.primaryDrive?.displayName}`);
  console.log(`- Health: ${overview.healthyCount} Healthy, ${overview.warningCount} Warning, ${overview.criticalCount} Critical`);
  console.log("=== LIVE WINDOWS STORAGE QUERY TEST COMPLETED ===");
}

main().catch((err) => {
  console.error("Live test error:", err);
  process.exit(1);
});
