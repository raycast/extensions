import { describe, expect, it, vi } from "vitest";
import type { FileRecord } from "../types";

const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));

vi.mock("node:child_process", () => ({ execFile }));

import { enrichLastUsed, parseLastUsedRaw } from "../mdls";

function record(path: string, modifiedMs: number): FileRecord {
  return {
    path,
    name: path.slice(path.lastIndexOf("/") + 1),
    ext: "psd",
    app: "photoshop",
    folder: "/work",
    volume: "/",
    modifiedMs,
    lastUsedMs: null,
    sizeBytes: null,
  };
}

describe("parseLastUsedRaw", () => {
  it("parses the mdls raw date format with timezone", () => {
    const ms = parseLastUsedRaw("2026-06-20 14:32:11 +0000");
    expect(ms).toBe(Date.UTC(2026, 5, 20, 14, 32, 11));
  });
  it("applies the timezone offset", () => {
    const utc = parseLastUsedRaw("2026-06-20 14:32:11 +0000")!;
    const plusTwo = parseLastUsedRaw("2026-06-20 16:32:11 +0200")!;
    expect(plusTwo).toBe(utc);
  });
  it("returns null for (null) and blanks", () => {
    expect(parseLastUsedRaw("(null)")).toBeNull();
    expect(parseLastUsedRaw("")).toBeNull();
    expect(parseLastUsedRaw("   ")).toBeNull();
  });
  it("returns null for unparseable junk", () => {
    expect(parseLastUsedRaw("not a date")).toBeNull();
  });
});

describe("enrichLastUsed", () => {
  it("checks old files too, so recent opens are not excluded by modification time", async () => {
    execFile.mockImplementation((_command, args, _options, callback) => {
      const stdout = args
        .slice(5)
        .map((path) => (path === "/work/old-but-recent.psd" ? "2026-06-20 14:32:11 +0000" : "(null)"))
        .join("\0");
      callback(null, { stdout, stderr: "" });
    });
    const records = [record("/work/new.psd", 3), record("/work/middle.psd", 2), record("/work/old-but-recent.psd", 1)];

    await enrichLastUsed(records, { indexedVolumes: new Set(["/"]), batchSize: 2, concurrency: 1 });

    expect(execFile).toHaveBeenCalledTimes(2);
    expect(records[2].lastUsedMs).toBe(Date.UTC(2026, 5, 20, 14, 32, 11));
  });
});
