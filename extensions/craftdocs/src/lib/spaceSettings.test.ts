import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { tmpdir } from "os";
import { SpaceSettingsStore } from "./spaceSettings";

describe("SpaceSettingsStore", () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    temporaryDirectories.forEach((directoryPath) => rmSync(directoryPath, { recursive: true, force: true }));
    temporaryDirectories.length = 0;
  });

  it("migrates legacy settings into the extension support path", () => {
    const directoryPath = mkdtempSync(join(tmpdir(), "craftdocs-settings-"));
    temporaryDirectories.push(directoryPath);

    const settingsPath = join(directoryPath, "support", "space-settings.json");
    const legacySettingsPath = join(directoryPath, "legacy", "raycast-spaces-config.json");

    mkdirSync(dirname(legacySettingsPath), { recursive: true });
    writeFileSync(
      legacySettingsPath,
      JSON.stringify({
        "space-1": { customName: "Primary", isEnabled: false },
      }),
    );

    const store = new SpaceSettingsStore(settingsPath, legacySettingsPath);
    const result = store.load();

    expect(result).toEqual({
      settings: {
        "space-1": { customName: "Primary", isEnabled: false },
      },
      issues: [],
      migratedLegacySettings: true,
    });

    expect(JSON.parse(readFileSync(settingsPath, "utf-8"))).toEqual({
      version: 1,
      spaces: {
        "space-1": { customName: "Primary", isEnabled: false },
      },
    });
  });

  it("ignores malformed legacy settings safely", () => {
    const directoryPath = mkdtempSync(join(tmpdir(), "craftdocs-settings-"));
    temporaryDirectories.push(directoryPath);

    const settingsPath = join(directoryPath, "support", "space-settings.json");
    const legacySettingsPath = join(directoryPath, "legacy", "raycast-spaces-config.json");

    mkdirSync(dirname(legacySettingsPath), { recursive: true });
    writeFileSync(legacySettingsPath, "{not-json");

    const store = new SpaceSettingsStore(settingsPath, legacySettingsPath);
    const result = store.load();

    expect(result).toEqual({
      settings: {},
      issues: [{ code: "invalid-legacy-settings", path: legacySettingsPath }],
      migratedLegacySettings: false,
    });
  });

  it("ignores malformed new settings safely", () => {
    const directoryPath = mkdtempSync(join(tmpdir(), "craftdocs-settings-"));
    temporaryDirectories.push(directoryPath);

    const settingsPath = join(directoryPath, "support", "space-settings.json");
    const legacySettingsPath = join(directoryPath, "legacy", "raycast-spaces-config.json");

    mkdirSync(dirname(settingsPath), { recursive: true });
    writeFileSync(settingsPath, JSON.stringify({ version: 9, spaces: [] }));

    const store = new SpaceSettingsStore(settingsPath, legacySettingsPath);
    const result = store.load();

    expect(result).toEqual({
      settings: {},
      issues: [{ code: "invalid-settings", path: settingsPath }],
      migratedLegacySettings: false,
    });
  });

  it("does not throw when saving settings fails", () => {
    const writeTextFile = vi.fn(() => {
      throw new Error("disk full");
    });
    const store = new SpaceSettingsStore("/tmp/support/space-settings.json", "/tmp/legacy/raycast-spaces-config.json", {
      fileExists: () => false,
      readTextFile: () => "",
      writeTextFile,
      ensureDirectory: vi.fn(),
    });

    expect(() => store.save({ "space-1": { customName: "Primary", isEnabled: true } })).not.toThrow();
    expect(writeTextFile).toHaveBeenCalledOnce();
  });
});
