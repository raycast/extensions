import { describe, it, expect, vi, afterEach } from "vitest";
import * as path from "node:path";

vi.mock("node:fs", () => ({
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  existsSync: vi.fn(),
}));

import * as fs from "node:fs";
import { findChromiumProfile, findFirefoxProfile, resolveBrowser } from "../src/lib/browsers";

afterEach(() => vi.restoreAllMocks());

type Profile = { name: string; mtimeMs: number; hasCookies: boolean };

const dirEntry = (name: string) =>
  ({ name, isDirectory: () => true, isFile: () => false }) as unknown as fs.Dirent;

function setupFirefoxProfiles(baseDir: string, profiles: Profile[]) {
  vi.mocked(fs.readdirSync).mockImplementation((dir) => {
    if (String(dir) === baseDir) return profiles.map((p) => dirEntry(p.name)) as never;
    throw new Error(`unexpected readdir: ${String(dir)}`);
  });
  vi.mocked(fs.existsSync).mockImplementation((p) => {
    const str = String(p);
    return profiles.some((profile) =>
      str === path.join(baseDir, profile.name, "cookies.sqlite") && profile.hasCookies,
    );
  });
  vi.mocked(fs.statSync).mockImplementation((p) => {
    const profile = profiles.find((pp) => String(p) === path.join(baseDir, pp.name));
    if (!profile) throw new Error(`unexpected stat: ${String(p)}`);
    return { mtimeMs: profile.mtimeMs } as fs.Stats;
  });
}

describe("findFirefoxProfile", () => {
  const ctx = { platform: "win32" as NodeJS.Platform, home: "/home/u" };
  const baseDir = path.join("/home/u", "AppData/Roaming/zen/Profiles");
  const paths = { win: "AppData/Roaming/zen/Profiles" };

  it("returns the profile with the most recent mtime that has cookies.sqlite", () => {
    setupFirefoxProfiles(baseDir, [
      { name: "old.default", mtimeMs: 1000, hasCookies: true },
      { name: "new.default", mtimeMs: 2000, hasCookies: true },
    ]);
    expect(findFirefoxProfile(paths, ctx)).toBe(path.join(baseDir, "new.default"));
  });

  it("ignores profiles without cookies.sqlite", () => {
    setupFirefoxProfiles(baseDir, [
      { name: "empty.default", mtimeMs: 2000, hasCookies: false },
      { name: "real.default", mtimeMs: 1000, hasCookies: true },
    ]);
    expect(findFirefoxProfile(paths, ctx)).toBe(path.join(baseDir, "real.default"));
  });

  it("returns '' when no profile has cookies.sqlite", () => {
    setupFirefoxProfiles(baseDir, [{ name: "empty.default", mtimeMs: 2000, hasCookies: false }]);
    expect(findFirefoxProfile(paths, ctx)).toBe("");
  });

  it("returns '' when the directory cannot be read", () => {
    vi.mocked(fs.readdirSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(findFirefoxProfile(paths, ctx)).toBe("");
  });

  it("returns '' when the platform key is absent from paths", () => {
    expect(findFirefoxProfile({ mac: "Library/Application Support/zen/Profiles" }, ctx)).toBe("");
  });

  it("skips a profile whose stat fails and uses the next-best", () => {
    vi.mocked(fs.readdirSync).mockReturnValue([dirEntry("broken.default"), dirEntry("real.default")] as never);
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockImplementation((p) => {
      if (String(p).endsWith("broken.default")) throw new Error("EACCES");
      return { mtimeMs: 100 } as fs.Stats;
    });
    expect(findFirefoxProfile({ win: "AppData/Roaming/zen/Profiles" }, { platform: "win32", home: "/home/u" })).toBe(
      path.join("/home/u", "AppData/Roaming/zen/Profiles", "real.default"),
    );
  });

  it("uses the macOS path on darwin", () => {
    const macBase = path.join("/Users/x", "Library/Application Support/zen/Profiles");
    setupFirefoxProfiles(macBase, [{ name: "p.default", mtimeMs: 100, hasCookies: true }]);
    expect(
      findFirefoxProfile(
        { mac: "Library/Application Support/zen/Profiles", win: "AppData/Roaming/zen/Profiles" },
        { platform: "darwin", home: "/Users/x" },
      ),
    ).toBe(path.join(macBase, "p.default"));
  });
});

describe("findChromiumProfile", () => {
  const ctx = { platform: "win32" as NodeJS.Platform, home: "/home/u" };
  const baseDir = path.join("/home/u", "AppData/Local/Arc/User Data");
  const paths = { win: "AppData/Local/Arc/User Data" };

  it("returns <base>/Default when <base>/Default/Cookies exists", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => String(p) === path.join(baseDir, "Default", "Cookies"));
    expect(findChromiumProfile(paths, ctx)).toBe(path.join(baseDir, "Default"));
  });

  it("returns <base>/Default when <base>/Default/Network/Cookies exists", () => {
    vi.mocked(fs.existsSync).mockImplementation(
      (p) => String(p) === path.join(baseDir, "Default", "Network", "Cookies"),
    );
    expect(findChromiumProfile(paths, ctx)).toBe(path.join(baseDir, "Default"));
  });

  it("returns '' when neither cookies path exists", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(findChromiumProfile(paths, ctx)).toBe("");
  });

  it("returns '' when the platform key is absent", () => {
    expect(findChromiumProfile({ mac: "Library/Application Support/Arc/User Data" }, ctx)).toBe("");
  });
});

describe("resolveBrowser", () => {
  const ctx = { platform: "win32" as NodeJS.Platform, home: "/home/u" };

  it("returns blank values for an empty id (None)", () => {
    expect(resolveBrowser("", undefined, ctx)).toEqual({ spec: "", label: "" });
  });

  it("passes a native id through with its capitalized label", () => {
    expect(resolveBrowser("chrome", undefined, ctx)).toEqual({ spec: "chrome", label: "Chrome" });
  });

  it("resolves a firefox fork to firefox:<path> when the profile is found", () => {
    const base = path.join("/home/u", "AppData/Roaming/zen/Profiles");
    setupFirefoxProfiles(base, [{ name: "p.default", mtimeMs: 100, hasCookies: true }]);
    expect(resolveBrowser("zen", undefined, ctx)).toEqual({
      spec: `firefox:${path.join(base, "p.default")}`,
      label: "Zen",
    });
  });

  it("warns when a firefox fork profile is missing", () => {
    vi.mocked(fs.readdirSync).mockReturnValue([]);
    expect(resolveBrowser("zen", undefined, ctx)).toMatchObject({
      spec: "",
      label: "Zen",
      warning: expect.stringContaining("No Zen profile"),
    });
  });

  it("resolves a chromium fork to chromium:<path> when Cookies exists", () => {
    const base = path.join("/home/u", "AppData/Local/Arc/User Data");
    vi.mocked(fs.existsSync).mockImplementation((p) => String(p) === path.join(base, "Default", "Cookies"));
    expect(resolveBrowser("arc", undefined, ctx)).toEqual({
      spec: `chromium:${path.join(base, "Default")}`,
      label: "Arc",
    });
  });

  it("warns when a chromium fork profile is missing", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(resolveBrowser("arc", undefined, ctx)).toMatchObject({
      spec: "",
      label: "Arc",
      warning: expect.stringContaining("No Arc profile"),
    });
  });

  it("returns a trimmed custom spec", () => {
    expect(resolveBrowser("custom", "  firefox:/some/path  ", ctx)).toEqual({
      spec: "firefox:/some/path",
      label: "Custom (firefox:/some/path)",
    });
  });

  it("warns when custom is selected but the spec is empty or whitespace", () => {
    expect(resolveBrowser("custom", "   ", ctx)).toMatchObject({
      spec: "",
      label: "Custom",
      warning: expect.stringContaining("Custom is selected but no Custom Browser Spec"),
    });
    expect(resolveBrowser("custom", undefined, ctx)).toMatchObject({ spec: "", label: "Custom" });
  });

  it("passes an unknown id through (forward-compat)", () => {
    expect(resolveBrowser("vivaldi-snapshot", undefined, ctx)).toEqual({
      spec: "vivaldi-snapshot",
      label: "vivaldi-snapshot",
    });
  });
});
