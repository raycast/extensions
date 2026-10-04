import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { findHomebrewPath, resetWingetPackagesCache, resolveBinary } from "../src/lib/binary";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(() => []),
}));

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/Users/test"),
}));

// Mock so the Windows branch's `where`-via-execFileSync call is deterministic —
// real execution would find whatever happens to be on the host's PATH.
vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(() => {
    throw new Error("where: not found");
  }),
}));

import * as fs from "node:fs";
import * as os from "node:os";
import { execFileSync } from "node:child_process";

const originalPlatform = process.platform;
const originalPath = process.env.PATH;
const originalLocalAppData = process.env.LOCALAPPDATA;
const originalUserProfile = process.env.USERPROFILE;

function setPlatform(platform: NodeJS.Platform) {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
}

beforeEach(() => {
  process.env.PATH = "";
  // The winget Packages listing is module-cached for perf; clear it so
  // tests don't see stale entries from a previous spec.
  resetWingetPackagesCache();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(fs.readdirSync).mockReturnValue([]);
  Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
  process.env.PATH = originalPath;
  if (originalLocalAppData === undefined) delete process.env.LOCALAPPDATA;
  else process.env.LOCALAPPDATA = originalLocalAppData;
  if (originalUserProfile === undefined) delete process.env.USERPROFILE;
  else process.env.USERPROFILE = originalUserProfile;
});

describe("resolveBinary on macOS", () => {
  beforeEach(() => setPlatform("darwin"));

  it("returns the preference path when it exists on disk", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    expect(resolveBinary("yt-dlp", "/custom/bin/yt-dlp")).toBe("/custom/bin/yt-dlp");
  });

  it("falls back to /opt/homebrew/bin when nothing is found on disk", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(resolveBinary("yt-dlp", "/missing/yt-dlp")).toBe("/opt/homebrew/bin/yt-dlp");
  });

  it("resolves a fallback default path when no preference is given", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(resolveBinary("gallery-dl")).toBe("/opt/homebrew/bin/gallery-dl");
  });

  it("returns the managed-binary path when it exists on disk (managed install takes precedence over system search)", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/support/spotdl");
    expect(resolveBinary("spotdl", undefined, "/support")).toBe("/support/spotdl");
  });

  it("falls back to a system spotdl (e.g. brew-installed) when the managed binary isn't downloaded yet", () => {
    // Picking up a brew-installed spotdl is what lets users avoid the
    // Rosetta-requiring prebuilt binary on Apple Silicon.
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/opt/homebrew/bin/spotdl");
    expect(resolveBinary("spotdl", undefined, "/support")).toBe("/opt/homebrew/bin/spotdl");
  });

  it("returns the managed path when neither the managed binary nor any system copy exists (lets the Installer surface 'not installed')", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(resolveBinary("spotdl", undefined, "/support")).toBe("/support/spotdl");
  });

  it("lets an existing preference path override the managed directory", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    expect(resolveBinary("spotdl", "/custom/spotdl", "/support")).toBe("/custom/spotdl");
  });

  it("finds the binary in /usr/local/bin on Intel Macs", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/usr/local/bin/yt-dlp");
    expect(resolveBinary("yt-dlp")).toBe("/usr/local/bin/yt-dlp");
  });

  it("prefers Apple-Silicon Homebrew over Intel Homebrew when both have the binary", () => {
    vi.mocked(fs.existsSync).mockImplementation(
      (p) => p === "/opt/homebrew/bin/yt-dlp" || p === "/usr/local/bin/yt-dlp",
    );
    expect(resolveBinary("yt-dlp")).toBe("/opt/homebrew/bin/yt-dlp");
  });

  it("finds a Cargo-installed binary in ~/.cargo/bin (e.g. monolith)", () => {
    // Literal POSIX strings — the source uses path.posix.join for these
    // mac-only paths, so the expected value must not pass through the host's
    // path module (which would rewrite `/` to `\` on Windows).
    const expected = "/Users/test/.cargo/bin/monolith";
    vi.mocked(fs.existsSync).mockImplementation((p) => p === expected);
    expect(resolveBinary("monolith")).toBe(expected);
  });

  it("finds a pipx-installed binary in ~/.local/bin (e.g. gallery-dl)", () => {
    const expected = "/Users/test/.local/bin/gallery-dl";
    vi.mocked(fs.existsSync).mockImplementation((p) => p === expected);
    expect(resolveBinary("gallery-dl")).toBe(expected);
  });

  it("finds a MacPorts-installed binary in /opt/local/bin", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/opt/local/bin/ffmpeg");
    expect(resolveBinary("ffmpeg")).toBe("/opt/local/bin/ffmpeg");
  });

  it("falls back to PATH entries when none of the well-known dirs match", () => {
    process.env.PATH = "/some/custom/bin:/another/bin";
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/another/bin/yt-dlp");
    expect(resolveBinary("yt-dlp")).toBe("/another/bin/yt-dlp");
  });

  it("ignores a preference path that doesn't exist and uses the discovered location", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/usr/local/bin/yt-dlp");
    expect(resolveBinary("yt-dlp", "/missing/yt-dlp")).toBe("/usr/local/bin/yt-dlp");
  });
});

describe("resolveBinary on Windows", () => {
  beforeEach(() => {
    setPlatform("win32");
    // Realistic winget defaults from the user's setup. The Windows search
    // anchors off these env vars; with them missing the function should
    // fall through silently rather than crash.
    process.env.LOCALAPPDATA = "C:\\Users\\PC\\AppData\\Local";
    process.env.USERPROFILE = "C:\\Users\\PC";
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("where: not found");
    });
    vi.mocked(fs.readdirSync).mockReturnValue([]);
  });

  it("returns the preference path when it exists on disk (winning over PATH and well-known dirs)", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    expect(resolveBinary("yt-dlp", "C:\\custom\\yt-dlp.exe")).toBe("C:\\custom\\yt-dlp.exe");
  });

  it("strips stray CR/LF from a preference path before checking it (Raycast textfields sometimes paste with trailing newlines)", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "C:\\custom\\yt-dlp.exe");
    expect(resolveBinary("yt-dlp", "C:\\custom\\yt-dlp.exe\r\n")).toBe("C:\\custom\\yt-dlp.exe");
  });

  it("uses `where` output when it succeeds (covers the common case where Raycast did inherit PATH)", () => {
    vi.mocked(execFileSync).mockReturnValue(Buffer.from("C:\\Users\\PC\\bin\\yt-dlp.exe\r\n"));
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(resolveBinary("yt-dlp")).toBe("C:\\Users\\PC\\bin\\yt-dlp.exe");
  });

  it("falls back to winget Packages directly when `where` misses (e.g. Raycast inherited a stripped PATH)", () => {
    const pkg =
      "C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe";
    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
      if (String(dir).endsWith("Packages")) {
        return ["yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe"] as unknown as fs.Dirent[];
      }
      return [] as fs.Dirent[];
    });
    vi.mocked(fs.existsSync).mockImplementation((p) => p === `${pkg}\\yt-dlp.exe`);
    expect(resolveBinary("yt-dlp")).toBe(`${pkg}\\yt-dlp.exe`);
  });

  it("finds ffmpeg in the nested winget layout (yt-dlp.FFmpeg ships the binary under <version>/bin/)", () => {
    const pkgBase =
      "C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe";
    const version = "ffmpeg-N-124279-g0f6ba39122-win64-gpl";
    const exe = `${pkgBase}\\${version}\\bin\\ffmpeg.exe`;
    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
      const s = String(dir);
      if (s.endsWith("Packages"))
        return ["yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"] as unknown as fs.Dirent[];
      if (s === pkgBase)
        return [version, "yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe.db"] as unknown as fs.Dirent[];
      return [] as fs.Dirent[];
    });
    vi.mocked(fs.existsSync).mockImplementation((p) => p === exe);
    expect(resolveBinary("ffmpeg")).toBe(exe);
  });

  it("finds a winget Links shim when winget created one (some packages publish shims here)", () => {
    const shim = "C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Links\\monolith.exe";
    vi.mocked(fs.existsSync).mockImplementation((p) => p === shim);
    expect(resolveBinary("monolith")).toBe(shim);
  });

  it("finds a Chocolatey-installed binary in ProgramData\\chocolatey\\bin", () => {
    const choco = "C:\\ProgramData\\chocolatey\\bin\\yt-dlp.exe";
    vi.mocked(fs.existsSync).mockImplementation((p) => p === choco);
    expect(resolveBinary("yt-dlp")).toBe(choco);
  });

  it("finds a Scoop-installed binary in <userprofile>\\scoop\\shims", () => {
    const scoop = "C:\\Users\\PC\\scoop\\shims\\gallery-dl.exe";
    vi.mocked(fs.existsSync).mockImplementation((p) => p === scoop);
    expect(resolveBinary("gallery-dl")).toBe(scoop);
  });

  it("returns an empty string when nothing is found (the Installer view then renders 'not installed')", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(resolveBinary("yt-dlp")).toBe("");
  });

  it("does NOT crash when LOCALAPPDATA is absent — winget-only candidates are skipped", () => {
    delete process.env.LOCALAPPDATA;
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(resolveBinary("yt-dlp")).toBe("");
  });

  it("returns the managed-binary path with a .exe suffix when the managed file exists (e.g. spotdl)", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/support/spotdl.exe");
    expect(resolveBinary("spotdl", undefined, "/support")).toBe("/support/spotdl.exe");
  });

  it("derives LOCALAPPDATA from os.homedir() when the env var is unset (Raycast's extension process)", () => {
    // Reproduce the user's environment: Raycast launches the extension
    // process with both LOCALAPPDATA and USERPROFILE unset, but os.homedir()
    // still returns the right path via Win32 GetUserProfileDirectory. The
    // search should fall back to <home>\AppData\Local and still find the
    // winget package.
    delete process.env.LOCALAPPDATA;
    delete process.env.USERPROFILE;
    vi.mocked(os.homedir).mockReturnValue("C:\\Users\\PC");
    const expected =
      "C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe";
    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
      if (String(dir).endsWith("Packages")) {
        return ["yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe"] as unknown as fs.Dirent[];
      }
      return [] as fs.Dirent[];
    });
    vi.mocked(fs.existsSync).mockImplementation((p) => p === expected);
    expect(resolveBinary("yt-dlp")).toBe(expected);
  });

  it("derives LOCALAPPDATA from APPDATA when LOCALAPPDATA is unset (APPDATA's Roaming sibling)", () => {
    delete process.env.LOCALAPPDATA;
    process.env.APPDATA = "C:\\Users\\PC\\AppData\\Roaming";
    const expected = "C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Links\\monolith.exe";
    vi.mocked(fs.existsSync).mockImplementation((p) => p === expected);
    expect(resolveBinary("monolith")).toBe(expected);
    delete process.env.APPDATA;
  });

  it("finds a binary via env.PATH when `where.exe` itself isn't reachable (PATH iteration fallback)", () => {
    // Real-world case: Raycast inherits a partial PATH that includes the
    // winget package dir, but `where.exe` isn't on the inherited PATH so
    // whichWindows returns empty. Iterating env.PATH directly recovers.
    process.env.PATH = "C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_…";
    const expected = "C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_…\\yt-dlp.exe";
    vi.mocked(fs.existsSync).mockImplementation((p) => p === expected);
    expect(resolveBinary("yt-dlp")).toBe(expected);
  });

  it("caches the winget Packages listing across resolveBinary calls (single readdirSync for N tools)", () => {
    // A single Download form render resolves yt-dlp, ffmpeg, ffprobe, and
    // deno back-to-back. Without the cache, each call would re-read the
    // Packages dir — wasteful sync I/O inside a React render.
    let topLevelReads = 0;
    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
      const s = String(dir);
      if (s.endsWith("Packages")) {
        topLevelReads++;
        return ["yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe"] as unknown as fs.Dirent[];
      }
      return [] as fs.Dirent[];
    });
    vi.mocked(fs.existsSync).mockReturnValue(false); // force the loop to scan all entries
    resolveBinary("yt-dlp");
    resolveBinary("ffmpeg");
    resolveBinary("ffprobe");
    resolveBinary("deno");
    expect(topLevelReads).toBe(1);
  });

  it("resetWingetPackagesCache() forces the next resolveBinary to re-read the directory (picks up a just-installed package)", () => {
    // The Installer calls this after a successful winget install (or after
    // winget reports the package was already installed) so a stale listing
    // from before the install doesn't shadow the new binary across the
    // immediately-following onRefresh().
    let topLevelReads = 0;
    let packagesPresent = false;
    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
      const s = String(dir);
      if (s.endsWith("Packages")) {
        topLevelReads++;
        return packagesPresent
          ? (["yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe"] as unknown as fs.Dirent[])
          : ([] as fs.Dirent[]);
      }
      return [] as fs.Dirent[];
    });
    vi.mocked(fs.existsSync).mockImplementation((p) =>
      String(p).endsWith("\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe"),
    );

    // Cold lookup: package not installed yet → empty listing → miss.
    expect(resolveBinary("yt-dlp")).toBe("");

    // User installs via winget; the listing now contains the package.
    packagesPresent = true;

    // Without invalidation the cached empty listing would still win.
    expect(resolveBinary("yt-dlp")).toBe("");

    // Installer invalidates and the next lookup re-reads.
    resetWingetPackagesCache();
    expect(resolveBinary("yt-dlp")).toContain("yt-dlp.exe");
    expect(topLevelReads).toBe(2);
  });
});

describe("findHomebrewPath", () => {
  beforeEach(() => setPlatform("darwin"));

  it("returns /opt/homebrew/bin/brew on Apple Silicon", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/opt/homebrew/bin/brew");
    expect(findHomebrewPath("/Users/test")).toBe("/opt/homebrew/bin/brew");
  });

  it("returns /usr/local/bin/brew on Intel Macs", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/usr/local/bin/brew");
    expect(findHomebrewPath("/Users/test")).toBe("/usr/local/bin/brew");
  });

  it("prefers Apple-Silicon brew over Intel brew when both exist", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/opt/homebrew/bin/brew" || p === "/usr/local/bin/brew");
    expect(findHomebrewPath("/Users/test")).toBe("/opt/homebrew/bin/brew");
  });

  it("falls back to /opt/homebrew/bin/brew when brew is not found anywhere", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(findHomebrewPath("/Users/test")).toBe("/opt/homebrew/bin/brew");
  });
});
