import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// getPreferenceValues is imported by the module under test — stub it before the
// module is loaded so every call returns a controllable value.
vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({ profileDirectorySuffix: "default-release" })),
}));

import { getPreferenceValues } from "@raycast/api";

// Import after the mock is in place so the module picks up the stub.
import { getBookmarksDirectoryPath, getHistoryDbPath } from "../index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROFILES_BASE = "/fake-home/Library/Application Support/Firefox/Profiles";

const setPrefs = (suffix: string) => vi.mocked(getPreferenceValues).mockReturnValue({ profileDirectorySuffix: suffix });

const mockProfiles = (entries: string[]) => vi.spyOn(fs, "readdirSync").mockReturnValue(entries as never);

const mockStatIsDir = (dirs: string[]) =>
  vi.spyOn(fs, "statSync").mockImplementation((filePath: fs.PathLike) => {
    const name = path.basename(String(filePath));
    return { isDirectory: () => dirs.includes(name) } as fs.Stats;
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getProfileName (via getHistoryDbPath)", () => {
  const originalPlatform = process.platform;
  const originalHome = process.env.HOME;

  beforeEach(() => {
    Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
    process.env.HOME = "/fake-home";
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    process.env.HOME = originalHome;
    vi.restoreAllMocks();
  });

  // --- Happy paths -----------------------------------------------------------

  it("returns the custom-suffix profile when a match exists", () => {
    setPrefs("my-profile");
    mockProfiles(["abc123.my-profile", "def456.default-release"]);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE, "abc123.my-profile", "places.sqlite"));
  });

  it("falls back to .default-release when no custom suffix matches", () => {
    setPrefs("nonexistent");
    mockProfiles(["abc123.default-release", "def456.default-nightly"]);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE, "abc123.default-release", "places.sqlite"));
  });

  it("falls back to .default-nightly when only nightly profile is present", () => {
    setPrefs("nonexistent");
    mockProfiles(["abc123.default-nightly"]);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE, "abc123.default-nightly", "places.sqlite"));
  });

  it("falls back to .default-esr when only ESR profile is present", () => {
    setPrefs("nonexistent");
    mockProfiles(["abc123.default-esr"]);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE, "abc123.default-esr", "places.sqlite"));
  });

  it("falls back to .default when only the plain default profile is present", () => {
    setPrefs("nonexistent");
    mockProfiles(["abc123.default"]);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE, "abc123.default", "places.sqlite"));
  });

  it("uses catch-all: picks first real directory alphabetically when no suffix matches", () => {
    setPrefs("nonexistent");
    mockProfiles(["Crash Reports", "installs.ini", "zzz.profile", "aaa.profile"]);
    mockStatIsDir(["zzz.profile", "aaa.profile"]);

    const result = getHistoryDbPath();

    // NON_PROFILE_ENTRIES entries are excluded; alphabetically "aaa.profile" comes first
    expect(result).toBe(path.join(PROFILES_BASE, "aaa.profile", "places.sqlite"));
  });

  it("excludes known non-profile entries from the catch-all fallback", () => {
    setPrefs("nonexistent");
    mockProfiles(["Crash Reports", "Pending Pings", "installs.ini", "profiles.ini", "real.profile"]);
    mockStatIsDir(["real.profile"]);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE, "real.profile", "places.sqlite"));
  });

  it("excludes non-directory entries from the catch-all fallback", () => {
    setPrefs("nonexistent");
    mockProfiles(["notadir.profile", "realdir.profile"]);
    // Only "realdir.profile" is a directory
    mockStatIsDir(["realdir.profile"]);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE, "realdir.profile", "places.sqlite"));
  });

  // --- Error paths ----------------------------------------------------------

  it("returns an empty path segment when the Profiles directory does not exist", () => {
    setPrefs("default-release");
    vi.spyOn(fs, "readdirSync").mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    const result = getHistoryDbPath();

    // getProfileName returns "" → path resolves to …/Profiles/places.sqlite
    expect(result).toBe(path.join(PROFILES_BASE, "places.sqlite"));
  });

  it("returns an empty path segment when the Profiles directory is completely empty", () => {
    setPrefs("nonexistent");
    mockProfiles([]);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE, "places.sqlite"));
  });

  it("returns an empty path segment when all entries are non-profile files", () => {
    setPrefs("nonexistent");
    mockProfiles(["installs.ini", "profiles.ini"]);
    // statSync won't be called for these because they're filtered by NON_PROFILE_ENTRIES
    // but guard just in case
    vi.spyOn(fs, "statSync").mockReturnValue({ isDirectory: () => false } as fs.Stats);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE, "places.sqlite"));
  });

  it("skips a catch-all candidate when statSync throws (e.g. a dangling symlink)", () => {
    setPrefs("nonexistent");
    mockProfiles(["broken-link", "good.profile"]);
    vi.spyOn(fs, "statSync").mockImplementation((filePath) => {
      if (String(filePath).endsWith("broken-link")) throw new Error("ENOENT");
      return { isDirectory: () => true } as fs.Stats;
    });

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE, "good.profile", "places.sqlite"));
  });

  // --- Public API surface (bookmarks path delegates to same logic) ----------

  it("getBookmarksDirectoryPath uses the same profile resolution", () => {
    setPrefs("default-release");
    mockProfiles(["abc123.default-release"]);

    const result = getBookmarksDirectoryPath();

    expect(result).toBe(path.join(PROFILES_BASE, "abc123.default-release", "bookmarkbackups"));
  });
});

// ---------------------------------------------------------------------------
// Windows platform tests
// ---------------------------------------------------------------------------

describe("getProfileName on Windows (via getHistoryDbPath)", () => {
  const originalPlatform = process.platform;
  const originalHome = process.env.HOME;
  const originalAppData = process.env.APPDATA;

  const PROFILES_BASE_WIN = path.join("C:\\Users\\test\\AppData\\Roaming", "Mozilla", "Firefox", "Profiles");

  beforeEach(() => {
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });
    process.env.APPDATA = "C:\\Users\\test\\AppData\\Roaming";
    // Unset HOME so we can confirm the Windows branch doesn't rely on it
    delete process.env.HOME;
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    process.env.HOME = originalHome;
    process.env.APPDATA = originalAppData;
    vi.restoreAllMocks();
  });

  it("resolves the profile path from APPDATA on Windows", () => {
    setPrefs("default-release");
    mockProfiles(["abc123.default-release"]);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE_WIN, "abc123.default-release", "places.sqlite"));
  });

  it("falls back to os.homedir() when APPDATA is not set on Windows", () => {
    delete process.env.APPDATA;
    vi.spyOn(os, "homedir").mockReturnValue("C:\\Users\\test");
    setPrefs("default-release");
    mockProfiles(["abc123.default-release"]);

    const result = getHistoryDbPath();

    const fallbackBase = path.join("C:\\Users\\test", "AppData", "Roaming", "Mozilla", "Firefox", "Profiles");
    expect(result).toBe(path.join(fallbackBase, "abc123.default-release", "places.sqlite"));
  });

  it("falls back to .default-release on Windows when custom suffix doesn't match", () => {
    setPrefs("nonexistent");
    mockProfiles(["abc.default-release", "def.default-nightly"]);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE_WIN, "abc.default-release", "places.sqlite"));
  });

  it("falls back to .default-nightly on Windows when only nightly profile is present", () => {
    setPrefs("nonexistent");
    mockProfiles(["abc123.default-nightly"]);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE_WIN, "abc123.default-nightly", "places.sqlite"));
  });

  it("falls back to .default-esr on Windows when only ESR profile is present", () => {
    setPrefs("nonexistent");
    mockProfiles(["abc123.default-esr"]);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE_WIN, "abc123.default-esr", "places.sqlite"));
  });

  it("getBookmarksDirectoryPath uses APPDATA on Windows", () => {
    setPrefs("default-release");
    mockProfiles(["abc123.default-release"]);

    const result = getBookmarksDirectoryPath();

    expect(result).toBe(path.join(PROFILES_BASE_WIN, "abc123.default-release", "bookmarkbackups"));
  });

  it("returns an empty path segment when the Profiles directory does not exist on Windows", () => {
    setPrefs("default-release");
    vi.spyOn(fs, "readdirSync").mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE_WIN, "places.sqlite"));
  });

  it("returns an empty path segment when the Profiles directory is empty on Windows", () => {
    setPrefs("nonexistent");
    mockProfiles([]);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE_WIN, "places.sqlite"));
  });

  it("returns an empty path segment when all entries are non-profile files on Windows", () => {
    setPrefs("nonexistent");
    mockProfiles(["installs.ini", "profiles.ini"]);
    vi.spyOn(fs, "statSync").mockReturnValue({ isDirectory: () => false } as fs.Stats);

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE_WIN, "places.sqlite"));
  });

  it("skips a catch-all candidate when statSync throws on Windows (e.g. a dangling symlink)", () => {
    setPrefs("nonexistent");
    mockProfiles(["broken-link", "good.profile"]);
    vi.spyOn(fs, "statSync").mockImplementation((filePath) => {
      if (String(filePath).endsWith("broken-link")) throw new Error("ENOENT");
      return { isDirectory: () => true } as fs.Stats;
    });

    const result = getHistoryDbPath();

    expect(result).toBe(path.join(PROFILES_BASE_WIN, "good.profile", "places.sqlite"));
  });
});
