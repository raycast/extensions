import { homedir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { getChromeAppPath, getLocalStatePath, getProfileDir, getUserDataDir } from "../src/lib/chrome-paths";

describe("chrome-paths", () => {
  it("resolves the user-data dir under the home directory", () => {
    expect(getUserDataDir()).toBe(join(homedir(), "Library", "Application Support", "Google", "Chrome"));
  });

  it("resolves Local State inside the user-data dir", () => {
    expect(getLocalStatePath()).toBe(join(getUserDataDir(), "Local State"));
  });

  it("joins a profile directory onto the user-data dir", () => {
    expect(getProfileDir("Profile 2")).toBe(join(getUserDataDir(), "Profile 2"));
    // Custom (non "Profile N") directory names must resolve the same way.
    expect(getProfileDir("Andy")).toBe(join(getUserDataDir(), "Andy"));
  });

  it("returns an app path ending in the app bundle name, or undefined", () => {
    const appPath = getChromeAppPath();
    if (appPath !== undefined) {
      expect(appPath.endsWith("Google Chrome.app")).toBe(true);
    }
  });
});
