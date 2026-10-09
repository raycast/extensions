import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { measureFolder, otherAppsDataInside, parseDu, runDu, sizeSentence } from "../src/folder-size";

describe("parseDu", () => {
  test("reads the total in KiB as bytes", () => {
    expect(parseDu({ stdout: "2048\t/Users/ada/Downloads\n", stderr: "", timedOut: false })).toEqual({
      bytes: 2_097_152,
      unreadableFolderCount: 0,
      skipsOtherAppsData: false,
    });
  });

  test("counts the folders du couldn't read", () => {
    const stderr = [
      "du: /Users/ada/Library/Mail: Operation not permitted",
      "du: /Users/ada/Private: Permission denied",
      "du: /Users/ada/gone: No such file or directory",
      "",
    ].join("\n");
    expect(parseDu({ stdout: "10\t/Users/ada\n", stderr, timedOut: false })?.unreadableFolderCount).toBe(2);
  });

  test("returns nothing without a total", () => {
    expect(parseDu({ stdout: "", stderr: "du: /x: No such file or directory\n", timedOut: false })).toBeUndefined();
  });
});

describe("measureFolder", () => {
  test("explains a timeout", async () => {
    const run = async () => ({ stdout: "", stderr: "", timedOut: true });
    expect(measureFolder("/", run)).rejects.toThrow("took too long");
  });

  test("passes on du's error when it prints no total", async () => {
    const run = async () => ({ stdout: "", stderr: "du: /x: No such file or directory\n", timedOut: false });
    expect(measureFolder("/x", run)).rejects.toThrow("No such file or directory");
  });

  test("tells du to skip other apps' data inside the folder, and says the size leaves it out", async () => {
    let skipped: string[] = [];
    const run = async (_path: string, names: string[]) => {
      skipped = names;
      return { stdout: "2048\t/Users/ada/Library\n", stderr: "", timedOut: false };
    };
    const size = await measureFolder("/Users/ada/Library", run, ["Containers", "Group Containers"]);
    expect(skipped).toEqual(["Containers", "Group Containers"]);
    expect(size.skipsOtherAppsData).toBe(true);
  });

  test("counts everything in a folder without other apps' data", async () => {
    const run = async () => ({ stdout: "2048\t/Users/ada/Projects\n", stderr: "", timedOut: false });
    expect((await measureFolder("/Users/ada/Projects", run, [])).skipsOtherAppsData).toBe(false);
  });

  test.skipIf(process.platform !== "darwin")("measures a real folder with the macOS du", async () => {
    const folder = await mkdtemp(join(tmpdir(), "sizewise-"));
    await writeFile(join(folder, "a"), Buffer.alloc(100_000));
    const size = await measureFolder(folder, runDu);
    expect(size.unreadableFolderCount).toBe(0);
    expect(size.bytes).toBeGreaterThanOrEqual(100_000);
  });
});

describe("otherAppsDataInside", () => {
  const home = "/Users/ada";
  const exists = (path: string) => !path.endsWith("Daemon Containers");

  test("finds the folders of other apps' data in the folder or below it", () => {
    for (const path of ["/", "/Users", home, `${home}/Library`, `${home}/Library/`, "/System/Volumes/Data/Users"]) {
      expect(otherAppsDataInside(path, home, exists)).toEqual(["Containers", "Group Containers"]);
    }
  });

  test("finds none in a folder they aren't in, even one with the same name", () => {
    expect(otherAppsDataInside(`${home}/Projects`, home, exists)).toEqual([]);
    expect(otherAppsDataInside(`${home}/Projects/Containers`, home, exists)).toEqual([]);
    expect(otherAppsDataInside(`${home}/Lib`, home, exists)).toEqual([]);
  });
});

describe("sizeSentence", () => {
  test("says how much space a folder takes up", () => {
    expect(
      sizeSentence("Downloads", { bytes: 18_420_000_000, unreadableFolderCount: 0, skipsOtherAppsData: false }),
    ).toBe("Downloads takes up 18.42 GB");
  });

  test("says at least, and how many folders couldn't be read", () => {
    expect(sizeSentence("Library", { bytes: 2_000_000, unreadableFolderCount: 1, skipsOtherAppsData: false })).toBe(
      "Library takes up at least 2 MB (1 folder couldn't be read)",
    );
    expect(sizeSentence("Library", { bytes: 2_000_000, unreadableFolderCount: 3, skipsOtherAppsData: false })).toBe(
      "Library takes up at least 2 MB (3 folders couldn't be read)",
    );
  });

  test("says at least when other apps' data isn't counted", () => {
    expect(sizeSentence("Library", { bytes: 2_000_000, unreadableFolderCount: 0, skipsOtherAppsData: true })).toBe(
      "Library takes up at least 2 MB (other apps' data isn't counted)",
    );
    expect(sizeSentence("Library", { bytes: 2_000_000, unreadableFolderCount: 2, skipsOtherAppsData: true })).toBe(
      "Library takes up at least 2 MB (2 folders couldn't be read, and other apps' data isn't counted)",
    );
  });
});
