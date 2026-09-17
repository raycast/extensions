import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { OutputRootNotFoundError, SourceNotFoundError } from "../lib/errors";
import {
  cleanPath,
  collapseNestedRoots,
  isSameOrDescendant,
  normalizeRoots,
  resolveEventOutputDir,
  resolveMergedOutputFilename,
  validateMergePaths,
} from "../lib/paths";

describe("paths", () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("cleans empty paths", () => {
    expect(cleanPath("  ")).toBeUndefined();
    expect(cleanPath("/tmp/clips")).toBe("/tmp/clips");
  });

  it("collapses nested roots", () => {
    const roots = collapseNestedRoots(["/Volumes/TeslaCam", "/Volumes/TeslaCam/RecentClips"]);
    expect(roots).toEqual(["/Volumes/TeslaCam"]);
  });

  it("detects descendant paths", () => {
    expect(isSameOrDescendant("/Volumes/TeslaCam", "/Volumes/TeslaCam/RecentClips")).toBe(true);
    expect(isSameOrDescendant("/Volumes/TeslaCam/RecentClips", "/Volumes/TeslaCam")).toBe(false);
  });

  it("normalizes and deduplicates roots", () => {
    expect(normalizeRoots(["/tmp/a", "/tmp/a/", " /tmp/a "])).toEqual([path.resolve("/tmp/a")]);
  });

  it("resolves default event output directory", () => {
    const outputDir = resolveEventOutputDir("/Volumes/TeslaCam/RecentClips/event-1", "/Volumes/TeslaCam/RecentClips");
    expect(outputDir).toBe("/Volumes/TeslaCam/RecentClips/event-1/merged");
  });

  it("resolves custom output root with disambiguation prefix", () => {
    const outputDir = resolveEventOutputDir(
      "/Volumes/USB/TeslaCam/event-1",
      "/Volumes/USB/TeslaCam",
      "/Users/out/Merged",
    );
    expect(outputDir).toBe(path.join("/Users/out/Merged", "USB_TeslaCam", "event-1"));
  });

  it("resolves merged output filenames with camera and event date", () => {
    expect(resolveMergedOutputFilename("front", "2025-09-29_07-01-59")).toBe("front-2025-09-29_07-01-59.mp4");
    expect(resolveMergedOutputFilename("left_repeater", "2025-10-23_21-50-08")).toBe(
      "left_repeater-2025-10-23_21-50-08.mp4",
    );
  });

  it("throws SourceNotFoundError for missing source roots", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "tesla-paths-"));
    await expect(validateMergePaths([path.join(tempDir, "missing")])).rejects.toBeInstanceOf(SourceNotFoundError);
  });

  it("throws OutputRootNotFoundError for missing output root", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "tesla-paths-"));
    const sourceDir = path.join(tempDir, "source");
    await mkdir(sourceDir);
    await expect(validateMergePaths([sourceDir], path.join(tempDir, "missing-output"))).rejects.toBeInstanceOf(
      OutputRootNotFoundError,
    );
  });

  it("passes validation when paths exist", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "tesla-paths-"));
    const sourceDir = path.join(tempDir, "source");
    const outputDir = path.join(tempDir, "output");
    await mkdir(sourceDir);
    await mkdir(outputDir);
    await expect(validateMergePaths([sourceDir], outputDir)).resolves.toBeUndefined();
  });
});
