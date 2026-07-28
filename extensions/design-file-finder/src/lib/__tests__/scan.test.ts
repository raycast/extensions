import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isAutoSavePath, isMountRoot, walkDesignFiles, walkRoot } from "../scan";
import { Drive } from "../types";

const root: Drive = { path: "/", name: "Macintosh HD", indexed: false, isRoot: true };
const external: Drive = { path: "/Volumes/SSD", name: "SSD", indexed: false, isRoot: false };

describe("walkRoot", () => {
  it("walks home for the root volume to stay fast", () => {
    expect(walkRoot(root, "/Users/me")).toBe("/Users/me");
  });
  it("walks the whole volume for external drives", () => {
    expect(walkRoot(external, "/Users/me")).toBe("/Volumes/SSD");
  });
});

describe("isAutoSavePath", () => {
  it("flags Premiere and After Effects auto-save folders", () => {
    expect(isAutoSavePath("/V/Proj/Adobe Premiere Pro Auto-Save/clip-2026.prproj")).toBe(true);
    expect(isAutoSavePath("/V/Proj/Adobe After Effects Auto-Save/comp.aep")).toBe(true);
    expect(isAutoSavePath("/V/Proj/AutoSave/x.psd")).toBe(true);
  });
  it("leaves normal project paths alone", () => {
    expect(isAutoSavePath("/V/Clients/Acme/final.prproj")).toBe(false);
    expect(isAutoSavePath("/V/autosaved-notes/file.psd")).toBe(false);
  });
});

describe("isMountRoot", () => {
  it("recognizes /, /Volumes, and bare volume mounts", () => {
    expect(isMountRoot("/")).toBe(true);
    expect(isMountRoot("/Volumes")).toBe(true);
    expect(isMountRoot("/Volumes/SSD")).toBe(true);
    expect(isMountRoot("/Volumes/SSD/Projects")).toBe(false);
    expect(isMountRoot("/Users/me")).toBe(false);
  });
});

describe("walkDesignFiles", () => {
  it("follows a directory symlink into linked project files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cff-walk-"));
    try {
      const real = join(dir, "real-projects");
      const start = join(dir, "work");
      await mkdir(real);
      await mkdir(start);
      await writeFile(join(real, "linked.psd"), "x");
      await writeFile(join(start, "local.ai"), "y");
      await symlink(real, join(start, "link"));
      const found = await walkDesignFiles(start, ["psd", "ai"]);
      expect(found.sort()).toEqual([join(start, "link", "linked.psd"), join(start, "local.ai")].sort());
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not hang on a symlink cycle", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cff-cycle-"));
    try {
      const a = join(dir, "a");
      const b = join(dir, "b");
      await mkdir(a);
      await mkdir(b);
      await writeFile(join(a, "keep.psd"), "x");
      await symlink(b, join(a, "to-b"));
      await symlink(a, join(b, "to-a"));
      const found = await walkDesignFiles(dir, ["psd"]);
      expect(found).toEqual([join(a, "keep.psd")]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("skips symlink targets that resolve to a volume mount root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cff-mount-"));
    try {
      await writeFile(join(dir, "local.psd"), "x");
      // Point at `/` — must not pull the whole filesystem into results.
      await symlink("/", join(dir, "root-link"));
      const found = await walkDesignFiles(dir, ["psd"]);
      expect(found).toEqual([join(dir, "local.psd")]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
