import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectCompanionSeed } from "../lib/companion-detection";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const directory = tempDirs.pop();
    if (!directory) {
      continue;
    }
    try {
      rmSync(directory, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup.
    }
  }
});

function createTempDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "qs-companion-detect-"));
  tempDirs.push(directory);
  return directory;
}

describe("companion-detection", () => {
  it("prefers cursor marker over git when both exist", () => {
    const directory = createTempDirectory();
    mkdirSync(join(directory, ".cursor"));
    mkdirSync(join(directory, ".git"));

    const seed = detectCompanionSeed(directory, (presetId) =>
      presetId === "cursor"
        ? { path: "C:\\Apps\\Cursor.exe", arguments: "." }
        : presetId === "fork"
          ? { path: "C:\\Apps\\Fork.exe", arguments: "{folder}" }
          : null,
    );

    expect(seed).toMatchObject({ presetId: "cursor", marker: ".cursor", path: "C:\\Apps\\Cursor.exe" });
  });

  it("falls back from fork to github-desktop for .git", () => {
    const directory = createTempDirectory();
    mkdirSync(join(directory, ".git"));
    writeFileSync(join(directory, ".git", "HEAD"), "ref: refs/heads/main");

    const seed = detectCompanionSeed(directory, (presetId) =>
      presetId === "github-desktop" ? { path: "C:\\Apps\\GitHubDesktop.exe", arguments: "{folder}" } : null,
    );

    expect(seed?.presetId).toBe("github-desktop");
  });

  it("returns null when markers exist but no preset is installed", () => {
    const directory = createTempDirectory();
    mkdirSync(join(directory, ".vscode"));
    expect(detectCompanionSeed(directory, () => null)).toBeNull();
  });
});
