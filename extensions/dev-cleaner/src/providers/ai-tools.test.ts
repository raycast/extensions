import { mkdtemp, mkdir, rm, symlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { AiToolsProvider, compareVersionNames } from "./ai-tools";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createFixture(): Promise<string> {
  const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-ai-"));
  temporaryDirectories.push(home);
  const codexReleases = path.join(home, ".codex/packages/standalone/releases");
  for (const version of ["0.9.0-arm64", "0.10.0-arm64", "0.11.0-arm64"]) {
    await mkdir(path.join(codexReleases, version), { recursive: true });
    await writeFile(path.join(codexReleases, version, "codex"), version);
  }
  await symlink(path.join(codexReleases, "0.11.0-arm64"), path.join(home, ".codex/packages/standalone/current"));

  const codexTmp = path.join(home, ".codex/.tmp");
  await mkdir(path.join(codexTmp, "old"), { recursive: true });
  await mkdir(path.join(codexTmp, "recent"), { recursive: true });
  const old = new Date("2026-09-01T00:00:00Z");
  await utimes(path.join(codexTmp, "old"), old, old);

  const claudeVersions = path.join(home, ".local/share/claude/versions");
  await mkdir(claudeVersions, { recursive: true });
  for (const version of ["2.1.1", "2.1.2", "2.1.3"]) await writeFile(path.join(claudeVersions, version), version);
  await mkdir(path.join(home, ".local/bin"), { recursive: true });
  await symlink(path.join(claudeVersions, "2.1.3"), path.join(home, ".local/bin/claude"));
  return home;
}

describe("AI tools provider", () => {
  it("sorts numeric version components", () => {
    expect(compareVersionNames("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect(compareVersionNames("2.1.3", "2.1.3")).toBe(0);
    expect(compareVersionNames("alpha", "beta")).toBeLessThan(0);
  });

  it("protects the current and previous versions and finds stale temp data", async () => {
    const home = await createFixture();
    const result = await new AiToolsProvider().scan({
      homeDirectory: home,
      projectRoots: [],
      now: new Date("2026-09-24T00:00:00Z"),
    });

    expect(result.issues).toEqual([]);
    expect(result.candidates.map((candidate) => candidate.title)).toEqual(
      expect.arrayContaining(["0.9.0-arm64 (old version)", "2.1.1 (old version)", "old"]),
    );
    expect(result.candidates.some((candidate) => candidate.title.includes("0.10.0"))).toBe(false);
    expect(result.candidates.some((candidate) => candidate.title === "recent")).toBe(false);
  });

  it("returns an empty scan when tools are not installed", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-ai-empty-"));
    temporaryDirectories.push(home);
    await expect(new AiToolsProvider().scan({ homeDirectory: home, projectRoots: [] })).resolves.toEqual({
      candidates: [],
      issues: [],
      protectedItems: [],
    });
  });

  it("keeps Claude results when the Codex version source fails", async () => {
    const home = await createFixture();
    await rm(path.join(home, ".codex/packages/standalone/releases/0.11.0-arm64"), {
      recursive: true,
      force: true,
    });
    const result = await new AiToolsProvider().scan({
      homeDirectory: home,
      projectRoots: [],
      now: new Date("2026-09-24T00:00:00Z"),
    });
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ providerId: "codex" })]));
    expect(result.candidates.some((candidate) => candidate.providerId === "claude")).toBe(true);
  });

  it("protects the newest release when the current link points to an older version", async () => {
    const home = await createFixture();
    const currentLink = path.join(home, ".codex/packages/standalone/current");
    await rm(currentLink);
    await symlink(path.join(home, ".codex/packages/standalone/releases/0.10.0-arm64"), currentLink);

    const result = await new AiToolsProvider().scan({ homeDirectory: home, projectRoots: [] });

    expect(result.protectedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "0.11.0-arm64", reason: "Newest installed version" }),
        expect.objectContaining({ title: "0.10.0-arm64", reason: "Current installed version" }),
      ]),
    );
  });

  it("ignores symlinked releases and temporary entries", async () => {
    const home = await createFixture();
    const releases = path.join(home, ".codex/packages/standalone/releases");
    await symlink(path.join(releases, "0.9.0-arm64"), path.join(releases, "latest"));
    const outside = path.join(home, "outside");
    await mkdir(outside);
    const old = new Date("2026-09-01T00:00:00Z");
    await utimes(outside, old, old);
    await symlink(outside, path.join(home, ".codex/.tmp/linked"));

    const result = await new AiToolsProvider().scan({
      homeDirectory: home,
      projectRoots: [],
      now: new Date("2026-09-24T00:00:00Z"),
    });

    expect(result.issues).toEqual([]);
    expect(result.candidates.some((candidate) => candidate.path?.endsWith("latest"))).toBe(false);
    expect(result.candidates.some((candidate) => candidate.title === "linked")).toBe(false);
    expect(result.candidates.some((candidate) => candidate.title === "old")).toBe(true);
  });
});
