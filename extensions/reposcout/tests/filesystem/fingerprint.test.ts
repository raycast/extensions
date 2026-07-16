import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { utimesSync } from "node:fs";
import { computeFingerprint } from "../../src/filesystem/fingerprint";
import { makeTempTree, type TempTree } from "../helpers/tmp";

describe("computeFingerprint", () => {
  let tree: TempTree;

  beforeEach(() => {
    tree = makeTempTree();
  });

  afterEach(() => {
    tree.cleanup();
  });

  it("produces a fingerprint for a normal repo with HEAD and index", async () => {
    const repo = tree.gitRepo("proj");
    const fp = await computeFingerprint(repo, "normal");
    expect(fp).toContain("HEAD:");
    expect(fp).toContain("index:");
  });

  it("changes when a state file's mtime changes", async () => {
    const repo = tree.gitRepo("proj");
    const before = await computeFingerprint(repo, "normal");
    // Advance HEAD's mtime by 10 seconds.
    const future = new Date(Date.now() + 10_000);
    utimesSync(`${repo}/.git/HEAD`, future, future);
    const after = await computeFingerprint(repo, "normal");
    expect(after).not.toBe(before);
  });

  it("returns null when no state files exist", async () => {
    const dir = tree.dir("empty");
    expect(await computeFingerprint(dir, "normal")).toBeNull();
  });

  it("reads bare repositories from their root", async () => {
    const repo = tree.bareRepo("bare.git");
    const fp = await computeFingerprint(repo, "bare");
    expect(fp).toContain("HEAD:");
  });
});
