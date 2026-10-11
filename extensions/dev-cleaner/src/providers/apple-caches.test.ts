import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const { vanishedPaths } = vi.hoisted(() => ({ vanishedPaths: new Set<string>() }));
vi.mock("../lib/fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/fs")>();
  return {
    ...actual,
    pathExists: async (target: string) => !vanishedPaths.has(target) && actual.pathExists(target),
  };
});

import { AppleCachesProvider } from "./apple-caches";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vanishedPaths.clear();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Apple developer cache provider", () => {
  it("finds regenerable caches and individual DeviceSupport versions", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-apple-"));
    temporaryDirectories.push(home);
    const paths = [
      "Library/Developer/CoreSimulator/Caches",
      "Library/Developer/Xcode/iOS DeviceSupport/18.0",
      "Library/Caches/CocoaPods",
      "Library/Caches/org.swift.swiftpm",
    ];
    for (const relativePath of paths) {
      const directory = path.join(home, relativePath);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, "item"), "cache");
    }
    await writeFile(path.join(home, "Library/Developer/Xcode/iOS DeviceSupport/README"), "not a runtime directory");

    const result = await new AppleCachesProvider().scan({ homeDirectory: home, projectRoots: [] });

    expect(result.issues).toEqual([]);
    expect(result.candidates).toHaveLength(4);
    expect(result.candidates.every((candidate) => !candidate.selectedByDefault)).toBe(true);
    expect(result.candidates.find((candidate) => candidate.title.includes("DeviceSupport"))?.risk).toBe("high");
  });

  it("isolates an unreadable cache shape", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-apple-error-"));
    temporaryDirectories.push(home);
    const deviceSupport = path.join(home, "Library/Developer/Xcode/iOS DeviceSupport");
    await mkdir(path.dirname(deviceSupport), { recursive: true });
    await writeFile(deviceSupport, "not a directory");

    const result = await new AppleCachesProvider().scan({ homeDirectory: home, projectRoots: [] });
    expect(result.issues).toEqual([expect.objectContaining({ providerId: "simulator" })]);
  });

  it("skips empty cache directories", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-apple-empty-"));
    temporaryDirectories.push(home);
    await mkdir(path.join(home, "Library/Caches/CocoaPods"), { recursive: true });
    const result = await new AppleCachesProvider().scan({ homeDirectory: home, projectRoots: [] });
    expect(result.candidates).toEqual([]);
  });

  it("skips a DeviceSupport version removed between listing and measuring", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-apple-race-"));
    temporaryDirectories.push(home);
    const deviceSupport = path.join(home, "Library/Developer/Xcode/iOS DeviceSupport");
    for (const version of ["17.0", "18.0"]) {
      await mkdir(path.join(deviceSupport, version), { recursive: true });
      await writeFile(path.join(deviceSupport, version, "item"), version);
    }
    vanishedPaths.add(path.join(deviceSupport, "17.0"));

    const result = await new AppleCachesProvider().scan({ homeDirectory: home, projectRoots: [] });

    expect(result.issues).toEqual([]);
    expect(result.candidates.map((candidate) => candidate.title)).toEqual(["iOS DeviceSupport 18.0"]);
  });
});
