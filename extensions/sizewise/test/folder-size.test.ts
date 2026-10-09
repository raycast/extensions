import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { measureFolder, parseDu, runDu, sizeSentence } from "../src/folder-size";

describe("parseDu", () => {
  test("reads the total in KiB as bytes", () => {
    expect(parseDu({ stdout: "2048\t/Users/ada/Downloads\n", stderr: "", timedOut: false })).toEqual({
      bytes: 2_097_152,
      unreadableFolderCount: 0,
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

  test.skipIf(process.platform !== "darwin")("measures a real folder with the macOS du", async () => {
    const folder = await mkdtemp(join(tmpdir(), "sizewise-"));
    await writeFile(join(folder, "a"), Buffer.alloc(100_000));
    const size = await measureFolder(folder, runDu);
    expect(size.unreadableFolderCount).toBe(0);
    expect(size.bytes).toBeGreaterThanOrEqual(100_000);
  });
});

describe("sizeSentence", () => {
  test("says how much space a folder takes up", () => {
    expect(sizeSentence("Downloads", { bytes: 18_420_000_000, unreadableFolderCount: 0 })).toBe(
      "Downloads takes up 18.42 GB",
    );
  });

  test("says at least, and how many folders couldn't be read", () => {
    expect(sizeSentence("Library", { bytes: 2_000_000, unreadableFolderCount: 1 })).toBe(
      "Library takes up at least 2 MB (1 folder couldn't be read)",
    );
    expect(sizeSentence("Library", { bytes: 2_000_000, unreadableFolderCount: 3 })).toBe(
      "Library takes up at least 2 MB (3 folders couldn't be read)",
    );
  });
});
