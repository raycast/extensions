import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { XcodeProvider } from "./xcode";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Xcode provider", () => {
  it("lists each DerivedData directory for manual review", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-xcode-"));
    temporaryDirectories.push(home);
    const project = path.join(home, "Library/Developer/Xcode/DerivedData/App-hash");
    await mkdir(project, { recursive: true });
    await writeFile(path.join(project, "cache"), "123");
    await writeFile(path.join(path.dirname(project), "README.txt"), "ignored");
    await symlink(project, path.join(path.dirname(project), "current"));

    const result = await new XcodeProvider().scan({ homeDirectory: home, projectRoots: [] });
    expect(result.issues).toEqual([]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ title: "App-hash", bytes: 3, selectedByDefault: false });
  });

  it("is empty when DerivedData does not exist", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-xcode-empty-"));
    temporaryDirectories.push(home);
    await expect(new XcodeProvider().scan({ homeDirectory: home, projectRoots: [] })).resolves.toEqual({
      candidates: [],
      issues: [],
    });
  });

  it("reports an unreadable DerivedData shape as an issue", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-xcode-error-"));
    temporaryDirectories.push(home);
    const derivedData = path.join(home, "Library/Developer/Xcode/DerivedData");
    await mkdir(path.dirname(derivedData), { recursive: true });
    await writeFile(derivedData, "not a directory");

    const result = await new XcodeProvider().scan({ homeDirectory: home, projectRoots: [] });
    expect(result.candidates).toEqual([]);
    expect(result.issues).toEqual([expect.objectContaining({ providerId: "xcode" })]);
  });
});
