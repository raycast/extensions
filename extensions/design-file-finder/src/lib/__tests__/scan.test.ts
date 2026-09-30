import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isAutoSavePath, isMountRoot, isPathContainedIn, walkDesignFiles, walkRoot } from "../scan";
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

describe("isPathContainedIn", () => {
  it("matches the root and its descendants", () => {
    expect(isPathContainedIn("/Users/me/Work", "/Users/me/Work")).toBe(true);
    expect(isPathContainedIn("/Users/me/Work/projects", "/Users/me/Work")).toBe(true);
    expect(isPathContainedIn("/Users/me/Work2", "/Users/me/Work")).toBe(false);
    expect(isPathContainedIn("/Volumes/SSD/Projects", "/Volumes/SSD")).toBe(true);
  });

  it("treats / as containing every absolute path", () => {
    expect(isPathContainedIn("/Users/me", "/")).toBe(true);
    expect(isPathContainedIn("/Volumes/SSD", "/")).toBe(true);
  });
});

describe("walkDesignFiles", () => {
  it("follows a directory symlink that stays inside the scan root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cff-walk-"));
    try {
      const start = join(dir, "work");
      const projects = join(start, "projects");
      await mkdir(projects, { recursive: true });
      await writeFile(join(projects, "linked.psd"), "x");
      await writeFile(join(start, "local.ai"), "y");
      await symlink(projects, join(start, "link"));
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

  it("does not follow symlinks that resolve outside the scan root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cff-escape-"));
    try {
      const start = join(dir, "work");
      const outside = join(dir, "archive");
      await mkdir(start);
      await mkdir(outside);
      await writeFile(join(start, "local.psd"), "x");
      await writeFile(join(outside, "escaped.psd"), "y");
      await symlink(outside, join(start, "external"));
      const found = await walkDesignFiles(start, ["psd"]);
      expect(found).toEqual([join(start, "local.psd")]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
