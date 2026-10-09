import { describe, expect, test } from "bun:test";
import { largeFiles } from "../src/large-files";

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
