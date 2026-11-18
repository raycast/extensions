import { describe, expect, it, vi } from "vitest";

import { buildSystemReport } from "../lib/system-report";

vi.mock("../lib/hardware-info", () => ({
  getHardwareInfo: async () => ({
    modelName: "MacBook Pro",
    modelIdentifier: "Mac14,7",
    modelNumber: "Z16R000UMKS/A",
    modelYear: "2023",
    chip: "Apple M2",
    totalCores: "8",
    memory: "16 GB",
    serialNumber: "ABC123XYZ",
    gpuChipset: "Apple M2",
    gpuCores: "10",
    gpuMemory: "Shared (16 GB system memory)",
    isUnifiedMemory: true,
  }),
}));

vi.mock("../lib/os-version", () => ({
  getOSInfo: async () => ({ display: "macOS Sequoia 15.5 (24F74)" }),
}));

vi.mock("../lib/disk-info", () => ({
  calculateDiskStorage: async () => [
    { diskName: "Macintosh HD", totalSize: "494", totalAvailableStorage: "302", usedStorage: "192" },
  ],
  getRootVolumeDetails: async () => ({
    volumeName: "Macintosh HD",
    fileSystem: "APFS",
    mediaType: "SSD",
    protocol: "Apple Fabric",
    physicalStore: "disk0",
  }),
  getDiskHealthInfo: async () => ({
    deviceName: "APPLE SSD AP0512Z",
    mediumType: "SSD",
    smartStatus: "Verified",
    diskSize: "494 GB",
  }),
}));

vi.mock("../lib/memory-stats", () => ({
  getMemoryStats: async () => ({
    memTotal: 16384,
    memUsed: 8192,
    wired: 2048,
    compressed: 1024,
    swapUsed: 0,
    pressureLevel: "Normal",
  }),
}));

describe("buildSystemReport", () => {
  it("composes every section with the fetched values", async () => {
    const report = await buildSystemReport();

    expect(report).toContain("System Report");
    expect(report).toContain("Model: MacBook Pro");
    expect(report).toContain("Model Year: 2023");
    expect(report).toContain("Serial Number: ABC123XYZ");
    expect(report).toContain("macOS: macOS Sequoia 15.5 (24F74)");
    expect(report).toContain("SMART Status: Verified");
    expect(report).toContain("- Macintosh HD: 302 GB available of 494 GB (192 GB used)");
    expect(report).toContain("Total: 16 GB");
    expect(report).toContain("Used: 8 GB");
    expect(report).toContain("Pressure: Normal");
  });

  it("orders sections Hardware, Software, Storage, Memory", async () => {
    const report = await buildSystemReport();
    const positions = ["Hardware", "Software", "Storage", "Memory"].map((section) => report.indexOf(`\n${section}\n`));

    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
