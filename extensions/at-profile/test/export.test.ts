import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorage, preferences } from "@raycast/api";
import { validatePathInDirectory } from "../src/utils/file-security";
import { exportSettingsToFile } from "../src/yaml-settings";

beforeEach(async () => {
  await LocalStorage.clear();
});

describe("export", () => {
  it("writes to the Export Directory preference and never replaces an existing file", async () => {
    const directory = mkdtempSync(join(tmpdir(), "at-profile-export-"));
    preferences.exportDirectory = directory;

    const first = await exportSettingsToFile("settings.yaml");
    const second = await exportSettingsToFile("settings.yaml");

    expect(first).toBe(join(directory, "settings.yaml"));
    expect(second).toBe(join(directory, "settings 2.yaml"));
    expect(readdirSync(directory).sort()).toEqual(["settings 2.yaml", "settings.yaml"]);
  });

  it("accepts an Export Directory outside the home folder", async () => {
    // The temp folder is outside the home folder, like an external drive
    const directory = mkdtempSync(join(tmpdir(), "at-profile-export-"));
    preferences.exportDirectory = directory;
    expect(await exportSettingsToFile("settings.yaml")).toBe(join(directory, "settings.yaml"));
  });

  it("refuses a path that leaves the export directory", () => {
    expect(() => validatePathInDirectory("/tmp/exports/../settings.yaml", "/tmp/exports")).toThrow();
    expect(() => validatePathInDirectory("/tmp/exports-2/settings.yaml", "/tmp/exports")).toThrow();
    expect(() => validatePathInDirectory("/tmp/exports/settings.yaml", "/tmp/exports")).not.toThrow();
  });
});
