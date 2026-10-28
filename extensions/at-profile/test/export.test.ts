import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorage, preferences } from "@raycast/api";
import { exportSettingsToFile } from "../src/yaml-settings";

// The home-directory check would reject a temp folder; the test is about naming, not that check
vi.mock("../src/utils/file-security", async (original) => ({
  ...(await original<typeof import("../src/utils/file-security")>()),
  validateSecurePath: () => undefined,
}));

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
});
