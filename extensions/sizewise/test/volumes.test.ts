import { describe, expect, test } from "bun:test";
import { formatBytes } from "../src/format";
import { availableSpaceSummary, diskSpace, parseVolumes, usedFraction, Volume } from "../src/volumes";

describe("formatBytes", () => {
  test("matches ByteCountFormatter's file style", () => {
    expect(formatBytes(0)).toBe("Zero KB");
    expect(formatBytes(1)).toBe("1 byte");
    expect(formatBytes(999)).toBe("999 bytes");
    expect(formatBytes(1_500)).toBe("2 KB");
    expect(formatBytes(12_345_678)).toBe("12.3 MB");
    expect(formatBytes(212_345_678_901)).toBe("212.35 GB");
    expect(formatBytes(1_000_000_000_000)).toBe("1 TB");
    expect(formatBytes(1_234_000_000_000)).toBe("1.23 TB");
  });
});

const startupDisk: Volume = {
  path: "/",
  name: "Macintosh HD",
  totalCapacity: 1_000_000_000_000,
  availableCapacity: 212_345_678_901,
  isStartupDisk: true,
};

describe("parseVolumes", () => {
  test("lists the startup disk first, then the others by name", () => {
    const json = JSON.stringify([
      {
        path: "/Volumes/Backup 10",
        name: "Backup 10",
        totalCapacity: 2e12,
        availableCapacity: 1e12,
        isStartupDisk: false,
      },
      startupDisk,
      {
        path: "/Volumes/Backup 9",
        name: "backup 9",
        totalCapacity: 2e12,
        availableCapacity: null,
        isStartupDisk: false,
      },
    ]);
    expect(parseVolumes(json).map((volume) => volume.name)).toEqual(["Macintosh HD", "backup 9", "Backup 10"]);
  });

  test("drops entries that aren't volumes", () => {
    const json = JSON.stringify([startupDisk, { path: "relative", name: "X" }, null, "Backup"]);
    expect(parseVolumes(json)).toEqual([startupDisk]);
  });

  test("fails on output that isn't a list", () => {
    expect(() => parseVolumes("{}")).toThrow("The volume list isn't an array.");
    expect(() => parseVolumes("execution error")).toThrow();
  });
});

describe("available space", () => {
  test("summarizes available space like Sizewise's disk list", () => {
    expect(availableSpaceSummary(startupDisk)).toBe("212.35 GB of 1 TB available");
    expect(availableSpaceSummary({ ...startupDisk, availableCapacity: null })).toBe("1 TB");
  });

  test("gives the share in use, when it's known", () => {
    expect(usedFraction({ ...startupDisk, totalCapacity: 100, availableCapacity: 25 })).toBe(0.75);
    expect(usedFraction({ ...startupDisk, availableCapacity: null })).toBeUndefined();
    expect(usedFraction({ ...startupDisk, totalCapacity: 0 })).toBeUndefined();
  });
});

describe("diskSpace", () => {
  test("reports sizes as Sizewise shows them, with the share in use as a whole percentage", () => {
    expect(diskSpace(startupDisk)).toEqual({
      name: "Macintosh HD",
      path: "/",
      isStartupDisk: true,
      size: "1 TB",
      available: "212.35 GB",
      percentUsed: 79,
    });
  });

  test("leaves out what a volume doesn't report", () => {
    expect(diskSpace({ ...startupDisk, availableCapacity: null })).toEqual({
      name: "Macintosh HD",
      path: "/",
      isStartupDisk: true,
      size: "1 TB",
      available: undefined,
      percentUsed: undefined,
    });
  });
});
