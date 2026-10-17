import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "C:\\Users\\PC"),
}));

import * as os from "node:os";
import {
  defaultBinaryFallback,
  HOMEBREW_DEFAULT_PATH,
  macBinarySearchDirs,
  windowsBinarySearchDirs,
  windowsUserDirs,
  windowsWingetPath,
} from "../src/lib/platform-paths";

const originalEnv = { ...process.env };

beforeEach(() => {
  // Start each test with a clean env so prior cases don't leak LOCALAPPDATA etc.
  for (const k of ["LOCALAPPDATA", "USERPROFILE", "APPDATA"]) delete process.env[k];
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("macBinarySearchDirs", () => {
  it("returns the canonical order: Apple Silicon brew → Intel brew → MacPorts → user dirs → system bins", () => {
    expect(macBinarySearchDirs("/Users/test")).toEqual([
      "/opt/homebrew/bin",
      "/usr/local/bin",
      "/opt/local/bin",
      "/Users/test/.local/bin",
      "/Users/test/.cargo/bin",
      "/Users/test/.pyenv/shims",
      "/usr/bin",
      "/bin",
    ]);
  });
});

describe("windowsBinarySearchDirs", () => {
  it("emits the winget Links shim dir, Chocolatey bin, and Scoop shims with back-slashed paths", () => {
    expect(
      windowsBinarySearchDirs({ localAppData: "C:\\Users\\PC\\AppData\\Local", userProfile: "C:\\Users\\PC" }),
    ).toEqual([
      "C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Links",
      "C:\\ProgramData\\chocolatey\\bin",
      "C:\\Users\\PC\\scoop\\shims",
    ]);
  });

  it("skips entries whose anchor is empty (LOCALAPPDATA / USERPROFILE unset)", () => {
    expect(windowsBinarySearchDirs({ localAppData: "", userProfile: "" })).toEqual([
      "C:\\ProgramData\\chocolatey\\bin",
    ]);
  });
});

describe("windowsUserDirs", () => {
  it("prefers env vars when set", () => {
    expect(
      windowsUserDirs({
        LOCALAPPDATA: "C:\\Custom\\Local",
        USERPROFILE: "C:\\Custom\\Profile",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      localAppData: "C:\\Custom\\Local",
      userProfile: "C:\\Custom\\Profile",
    });
  });

  it("derives LOCALAPPDATA from APPDATA's Roaming sibling when LOCALAPPDATA is unset", () => {
    const result = windowsUserDirs({
      APPDATA: "C:\\Users\\PC\\AppData\\Roaming",
      USERPROFILE: "C:\\Users\\PC",
    } as NodeJS.ProcessEnv);
    expect(result.localAppData).toBe("C:\\Users\\PC\\AppData\\Local");
  });

  it("falls back to os.homedir() + AppData\\Local when both env vars are unset (Raycast's process)", () => {
    vi.mocked(os.homedir).mockReturnValue("C:\\Users\\PC");
    const result = windowsUserDirs({} as NodeJS.ProcessEnv);
    expect(result.userProfile).toBe("C:\\Users\\PC");
    expect(result.localAppData).toBe("C:\\Users\\PC\\AppData\\Local");
  });

  it("returns empty strings when neither env vars nor os.homedir() yield anything", () => {
    vi.mocked(os.homedir).mockReturnValue("");
    expect(windowsUserDirs({} as NodeJS.ProcessEnv)).toEqual({ localAppData: "", userProfile: "" });
  });
});

describe("windowsWingetPath", () => {
  it("composes the canonical MSIX launcher path under WindowsApps", () => {
    expect(windowsWingetPath({ LOCALAPPDATA: "C:\\Users\\PC\\AppData\\Local" } as NodeJS.ProcessEnv)).toBe(
      "C:\\Users\\PC\\AppData\\Local\\Microsoft\\WindowsApps\\winget.exe",
    );
  });

  it("returns empty when LOCALAPPDATA can't be resolved (caller falls through to error)", () => {
    vi.mocked(os.homedir).mockReturnValue("");
    expect(windowsWingetPath({} as NodeJS.ProcessEnv)).toBe("");
  });
});

describe("defaultBinaryFallback", () => {
  it("returns Apple Silicon Homebrew path on darwin", () => {
    expect(defaultBinaryFallback("yt-dlp", "darwin")).toBe("/opt/homebrew/bin/yt-dlp");
  });

  it("returns an empty string on Windows (no sane install-location guess)", () => {
    expect(defaultBinaryFallback("yt-dlp", "win32")).toBe("");
  });

  it("returns /usr/bin/<name> on Linux", () => {
    expect(defaultBinaryFallback("yt-dlp", "linux")).toBe("/usr/bin/yt-dlp");
  });
});

describe("HOMEBREW_DEFAULT_PATH", () => {
  it("is the Apple Silicon Homebrew brew binary path", () => {
    expect(HOMEBREW_DEFAULT_PATH).toBe("/opt/homebrew/bin/brew");
  });
});
