import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, copyFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  cocoaToDate,
  listHistory,
  parseEntry,
  getLatestEntry,
  listHistoryPaths,
} from "../../src/lib/history";

const FIXTURE_PATH = join(__dirname, "../fixtures/sample-history.json");

describe("cocoaToDate", () => {
  it("maps cocoa epoch 0 → 2001-01-01T00:00:00Z", () => {
    expect(cocoaToDate(0).toISOString()).toBe("2001-01-01T00:00:00.000Z");
  });

  it("maps the live sample creationDate to ~2026-05-17", () => {
    const sample = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
    const date = cocoaToDate(sample.creationDate);
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(4); // May
    expect(date.getUTCDate()).toBe(17);
  });
});

describe("parseEntry", () => {
  it("extracts text + modelId + duration from a real Spokenly JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "spokenly-hist-"));
    const dst = join(dir, "entry.json");
    copyFileSync(FIXTURE_PATH, dst);
    const entry = parseEntry(dst)!;
    expect(entry).not.toBeNull();
    expect(entry.id).toBe("C7746F81-6015-4B72-B651-089EAE652D7F");
    expect(entry.text).toContain("Hello world");
    expect(entry.modelId).toBe("gpt-4o-mini-transcribe");
    expect(entry.duration).toBeCloseTo(11.148, 1);
    expect(entry.audioPath.endsWith(".wav")).toBe(true);
    expect(entry.isError).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns null for malformed JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "spokenly-hist-bad-"));
    const dst = join(dir, "bad.json");
    writeFileSync(dst, "not json {{{", "utf-8");
    expect(parseEntry(dst)).toBeNull();
    rmSync(dir, { recursive: true, force: true });
  });

  it("flags isError when the Result envelope is .failure", () => {
    const dir = mkdtempSync(join(tmpdir(), "spokenly-hist-err-"));
    const dst = join(dir, "err.json");
    writeFileSync(
      dst,
      JSON.stringify({
        id: "X",
        creationDate: 0,
        content: { dictation: { _0: { failure: { _0: "boom" } } } },
      }),
      "utf-8",
    );
    const entry = parseEntry(dst)!;
    expect(entry.isError).toBe(true);
    expect(entry.text).toBe("");
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("listHistory / getLatestEntry", () => {
  let dir: string;
  let historyDir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "spokenly-history-"));
    historyDir = join(dir, "History");
    mkdirSync(historyDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns [] for an empty history dir", () => {
    expect(listHistory(historyDir)).toEqual([]);
    expect(getLatestEntry(historyDir)).toBeNull();
  });

  it("returns [] when history dir doesn't exist", () => {
    expect(listHistory(join(dir, "nope"))).toEqual([]);
  });

  it("scans nested date dirs and ignores non-json files", () => {
    const dateDir = join(historyDir, "2026-05-17");
    mkdirSync(dateDir);
    copyFileSync(FIXTURE_PATH, join(dateDir, "a.json"));
    writeFileSync(join(dateDir, "a.wav"), "fake wav");
    writeFileSync(join(dateDir, "stray.txt"), "ignore me");
    const paths = listHistoryPaths(historyDir);
    expect(paths.length).toBe(1);
    expect(paths[0].jsonPath.endsWith("a.json")).toBe(true);
  });

  it("orders results newest-first via creationDate", () => {
    const sample = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
    const dateDir = join(historyDir, "2026-05-17");
    mkdirSync(dateDir);
    const older = { ...sample, id: "OLDER", creationDate: 100 };
    const newer = { ...sample, id: "NEWER", creationDate: 999_999_999 };
    writeFileSync(join(dateDir, "older.json"), JSON.stringify(older));
    writeFileSync(join(dateDir, "newer.json"), JSON.stringify(newer));
    const list = listHistory(historyDir);
    expect(list[0].id).toBe("NEWER");
    expect(list[1].id).toBe("OLDER");
    expect(getLatestEntry(historyDir)!.id).toBe("NEWER");
  });
});
