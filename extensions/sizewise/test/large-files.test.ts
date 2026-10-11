import { describe, expect, test } from "bun:test";
import { largeFiles, searchedFolder } from "../src/large-files";

function file(blocks: number) {
  return { isFile: () => true, blocks, size: blocks * 512 };
}

describe("largeFiles", () => {
  const stats: Record<string, ReturnType<typeof file> | { isFile(): boolean; blocks: number; size: number }> = {
    "/Users/ada/Movies/trip.mov": file(4_000_000),
    "/Users/ada/Downloads/os.dmg": file(8_000_000),
    "/Users/ada/Downloads/offloaded.zip": { isFile: () => true, blocks: 0, size: 3_000_000_000 },
    "/Applications/Big.app": { isFile: () => false, blocks: 0, size: 0 },
  };
  const statPath = async (path: string) => {
    const info = stats[path];
    if (info === undefined) throw Object.assign(new Error("gone"), { code: "ENOENT" });
    return info;
  };

  test("lists files largest first by the space they take on disk", async () => {
    const files = await largeFiles([...Object.keys(stats), "/Users/ada/deleted.iso"], 100_000_000, statPath);
    expect(files).toEqual([
      { path: "/Users/ada/Downloads/os.dmg", name: "os.dmg", bytes: 4_096_000_000 },
      { path: "/Users/ada/Movies/trip.mov", name: "trip.mov", bytes: 2_048_000_000 },
    ]);
  });

  test("leaves out files that take less than the minimum on disk", async () => {
    const files = await largeFiles(Object.keys(stats), 3_000_000_000, statPath);
    expect(files.map((file) => file.name)).toEqual(["os.dmg"]);
  });
});

describe("largeFiles with many matches", () => {
  test("reads a few files at a time and still finds the largest", async () => {
    let reading = 0;
    let most = 0;
    const paths = Array.from({ length: 1_000 }, (_, index) => `/Volumes/Disk/file-${index}`);
    const statPath = async (path: string) => {
      reading += 1;
      most = Math.max(most, reading);
      await new Promise((resolve) => setTimeout(resolve, 0));
      reading -= 1;
      return file(Number(path.split("-")[1]) * 1_000);
    };
    const files = await largeFiles(paths, 0, statPath);
    expect(most).toBeLessThanOrEqual(16);
    expect(files).toHaveLength(200);
    expect(files[0].path).toBe("/Volumes/Disk/file-999");
    expect(files[199].path).toBe("/Volumes/Disk/file-800");
  });
});

describe("searchedFolder", () => {
  test("searches a passed folder exactly as it came", () => {
    expect(searchedFolder("/Volumes/My\\Disk", "/Users/ada/Movies", "/Users/ada")).toBe("/Volumes/My\\Disk");
    expect(searchedFolder("/Volumes/Backup ", undefined, "/Users/ada")).toBe("/Volumes/Backup ");
  });

  test("reads a leading ~ as the home folder and keeps the rest exactly", () => {
    expect(searchedFolder("~", undefined, "/Users/ada")).toBe("/Users/ada");
    expect(searchedFolder("~/Downloads", "/Users/ada/Movies", "/Users/ada")).toBe("/Users/ada/Downloads");
    expect(searchedFolder("~/My\\ Files ", undefined, "/Users/ada")).toBe("/Users/ada/My\\ Files ");
  });

  test("falls back to the preference's folder, then the home folder", () => {
    expect(searchedFolder(undefined, "/Users/ada/Movies", "/Users/ada")).toBe("/Users/ada/Movies");
    expect(searchedFolder("", "", "/Users/ada")).toBe("/Users/ada");
    expect(searchedFolder("Downloads", undefined, "/Users/ada")).toBe("/Users/ada");
  });
});
