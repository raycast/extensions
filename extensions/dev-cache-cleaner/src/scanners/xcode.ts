import type { ScanResult } from "../types";
import { expandHome, formatBytes, getItemCount, getSizeAsync, isDirPresent, isToolAvailableAsync } from "../utils/disk";

export async function scanXcode(): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  // DerivedData
  const derivedPath = expandHome("~/Library/Developer/Xcode/DerivedData");
  if (isDirPresent(derivedPath)) {
    const size = await getSizeAsync(derivedPath);
    const count = getItemCount(derivedPath);
    results.push({
      id: "xcode-derived-data",
      title: "Xcode DerivedData",
      description: `Build products and indexes for ${count} projects (${formatBytes(size)}). Safe to clean — Xcode rebuilds on next build.`,
      category: "xcode",
      path: derivedPath,
      size,
      itemCount: count,
      risk: "safe",
      available: true,
      cleanCommand: "rm -rf ~/Library/Developer/Xcode/DerivedData",
      cleanAction: { type: "rmrf" },
      icon: "app-window",
    });
  }

  // Archives
  const archivesPath = expandHome("~/Library/Developer/Xcode/Archives");
  if (isDirPresent(archivesPath)) {
    const size = await getSizeAsync(archivesPath);
    results.push({
      id: "xcode-archives",
      title: "Xcode Archives",
      description: `Signed app builds and dSYM files (${formatBytes(size)}). Review before cleaning — needed for App Store re-submission and crash symbolication.`,
      category: "xcode",
      path: archivesPath,
      size,
      risk: "moderate",
      available: true,
      cleanCommand: "rm -rf ~/Library/Developer/Xcode/Archives",
      cleanAction: { type: "rmrf" },
      icon: "app-window",
    });
  }

  // iOS Device Support
  const deviceSupportPath = expandHome("~/Library/Developer/Xcode/iOS DeviceSupport");
  if (isDirPresent(deviceSupportPath)) {
    const size = await getSizeAsync(deviceSupportPath);
    const count = getItemCount(deviceSupportPath);
    results.push({
      id: "xcode-device-support",
      title: "Xcode Device Support",
      description: `Debug symbols for ${count} iOS versions (${formatBytes(size)}). Safe to delete old versions — Xcode re-downloads when device is connected.`,
      category: "xcode",
      path: deviceSupportPath,
      size,
      itemCount: count,
      risk: "safe",
      available: true,
      cleanCommand: 'rm -rf "~/Library/Developer/Xcode/iOS DeviceSupport"',
      cleanAction: { type: "rmrf" },
      icon: "app-window",
    });
  }

  // CoreSimulator — must use xcrun, not rm -rf
  const simPath = expandHome("~/Library/Developer/CoreSimulator");
  if (isDirPresent(simPath)) {
    const size = await getSizeAsync(simPath);
    results.push({
      id: "xcode-simulators",
      title: "iOS Simulators (unavailable)",
      description: `Simulator runtimes and data (${formatBytes(size)} total). Only removes unavailable simulators via xcrun.`,
      category: "xcode",
      path: simPath,
      size,
      risk: "moderate",
      available: await isToolAvailableAsync("xcrun"),
      cleanCommand: "xcrun simctl delete unavailable",
      cleanAction: { type: "command", command: "xcrun", args: ["simctl", "delete", "unavailable"] },
      requiresTool: "xcrun",
      icon: "app-window",
    });
  }

  return results;
}
