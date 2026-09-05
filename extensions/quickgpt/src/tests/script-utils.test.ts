import fs from "fs";
import os from "os";
import path from "path";
import { getAvailableScriptsAsync, scanScriptsDirectory, scanScriptsDirectoryAsync } from "../utils/script-utils";

describe("script directory scanning", () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "quickgpt-scripts-"));
    fs.mkdirSync(path.join(directory, "nested"));
    fs.writeFileSync(path.join(directory, "Alpha.applescript"), "return 1");
    fs.writeFileSync(path.join(directory, "nested", "Beta.scpt"), "compiled");
    fs.writeFileSync(path.join(directory, "ignored.txt"), "ignored");
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("returns the same scripts from the non-blocking scanner", async () => {
    await expect(scanScriptsDirectoryAsync(directory)).resolves.toEqual(scanScriptsDirectory(directory));
  });

  it("keeps readable sibling scripts when a nested directory is unreadable", async () => {
    const nestedDirectory = path.join(directory, "nested");
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    fs.chmodSync(nestedDirectory, 0o000);

    try {
      const expected = [{ path: path.join(directory, "Alpha.applescript"), name: "Alpha" }];
      expect(scanScriptsDirectory(directory)).toEqual(expected);
      await expect(scanScriptsDirectoryAsync(directory)).resolves.toEqual(expected);
    } finally {
      fs.chmodSync(nestedDirectory, 0o755);
      consoleErrorSpy.mockRestore();
    }
  });

  it("returns and preserves a matching cache when a forced refresh is incomplete", async () => {
    const nestedDirectory = path.join(directory, "nested");
    const cachedScripts = await getAvailableScriptsAsync([directory], { forceRefresh: true });
    fs.writeFileSync(path.join(directory, "Gamma.applescript"), "return 3");
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    fs.chmodSync(nestedDirectory, 0o000);

    try {
      await expect(getAvailableScriptsAsync([directory], { forceRefresh: true })).resolves.toEqual(cachedScripts);
      await expect(getAvailableScriptsAsync([directory], { preferCache: true })).resolves.toEqual(cachedScripts);
    } finally {
      fs.chmodSync(nestedDirectory, 0o755);
      consoleErrorSpy.mockRestore();
    }
  });

  it("returns partial readable results without caching an incomplete first scan", async () => {
    const nestedDirectory = path.join(directory, "nested");
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    fs.chmodSync(nestedDirectory, 0o000);

    try {
      const expected = [{ path: path.join(directory, "Alpha.applescript"), name: "Alpha" }];
      await expect(getAvailableScriptsAsync([directory], { forceRefresh: true })).resolves.toEqual(expected);
      await expect(getAvailableScriptsAsync([directory], { preferCache: true })).resolves.toEqual([]);
    } finally {
      fs.chmodSync(nestedDirectory, 0o755);
      consoleErrorSpy.mockRestore();
    }
  });

  it("shares an in-flight forced refresh", async () => {
    const readdirSpy = jest.spyOn(fs.promises, "readdir");

    await Promise.all([
      getAvailableScriptsAsync([directory], { forceRefresh: true }),
      getAvailableScriptsAsync([directory], { forceRefresh: true }),
    ]);

    expect(readdirSpy).toHaveBeenCalledTimes(2);
    readdirSpy.mockRestore();
  });
});
