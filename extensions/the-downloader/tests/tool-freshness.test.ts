import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CHECK_TTL_MS,
  SNOOZE_MS,
  YTDLP_MAX_AGE_DAYS,
  compareVersions,
  describeUpdate,
  formatAge,
  getToolVersion,
  isPackageManagerInstall,
  isSnoozed,
  isYtdlpStale,
  packageFor,
  parseVersionOutput,
  parseYtdlpVersion,
  pendingUpdates,
  readCachedLatest,
  serializeLatest,
  singleFlight,
  toolsToCheck,
  withTimeout,
  ytdlpAgeDays,
} from "../src/lib/tool-freshness";

const NOW = Date.UTC(2026, 8, 29, 14, 0, 0); // 2026-09-29 14:00 UTC
const DAY = 86_400_000;

describe("parseYtdlpVersion", () => {
  it("reads the release date from a plain version", () => {
    expect(parseYtdlpVersion("2026.03.17")?.toISOString()).toBe("2026-03-17T00:00:00.000Z");
  });

  it("ignores nightly and post-release suffixes", () => {
    expect(parseYtdlpVersion("2026.03.17.232541")?.toISOString()).toBe("2026-03-17T00:00:00.000Z");
    expect(parseYtdlpVersion("2026.03.17.post1")?.toISOString()).toBe("2026-03-17T00:00:00.000Z");
  });

  it("accepts zero-stripped dates (Homebrew's formula spelling)", () => {
    expect(parseYtdlpVersion("2026.3.17")?.toISOString()).toBe("2026-03-17T00:00:00.000Z");
  });

  it("returns undefined for anything that is not a date version", () => {
    expect(parseYtdlpVersion("")).toBeUndefined();
    expect(parseYtdlpVersion("not installed")).toBeUndefined();
    expect(parseYtdlpVersion("1.32.14")).toBeUndefined();
    expect(parseYtdlpVersion("2026.13.40")).toBeUndefined();
    expect(parseYtdlpVersion("2026.02.30")).toBeUndefined();
  });
});

describe("ytdlpAgeDays / isYtdlpStale", () => {
  it("counts whole days since the release", () => {
    expect(ytdlpAgeDays("2026.03.17", NOW)).toBe(196);
    expect(ytdlpAgeDays("2026.09.29", NOW)).toBe(0);
    expect(ytdlpAgeDays("garbage", NOW)).toBeUndefined();
  });

  it("uses the same 90-day threshold as yt-dlp's own warning", () => {
    expect(YTDLP_MAX_AGE_DAYS).toBe(90);
    expect(isYtdlpStale("2026.03.17", NOW)).toBe(true);
    expect(isYtdlpStale("2026.08.19", NOW)).toBe(false);
  });

  it("is stale only past the limit, not at it", () => {
    const version = (d: Date) =>
      `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
    expect(isYtdlpStale(version(new Date(NOW - 90 * DAY)), NOW)).toBe(false);
    expect(isYtdlpStale(version(new Date(NOW - 91 * DAY)), NOW)).toBe(true);
  });

  it("never nags when the version cannot be read", () => {
    expect(isYtdlpStale("unknown", NOW)).toBe(false);
    expect(isYtdlpStale("", NOW)).toBe(false);
  });
});

describe("formatAge", () => {
  it("speaks in days for a couple of months, then months", () => {
    expect(formatAge(1)).toBe("1 day");
    expect(formatAge(45)).toBe("45 days");
    expect(formatAge(91)).toBe("3 months");
    expect(formatAge(196)).toBe("6 months");
  });
});

describe("isSnoozed", () => {
  it("is snoozed until the stored timestamp passes", () => {
    expect(SNOOZE_MS).toBe(DAY);
    expect(isSnoozed(String(NOW + 1000), NOW)).toBe(true);
    expect(isSnoozed(String(NOW - 1000), NOW)).toBe(false);
  });

  it("treats a missing or corrupt value as not snoozed", () => {
    expect(isSnoozed(undefined, NOW)).toBe(false);
    expect(isSnoozed("soon", NOW)).toBe(false);
  });
});

describe("parseVersionOutput", () => {
  it("pulls the version out of each tool's --version banner", () => {
    expect(parseVersionOutput("2026.08.19")).toBe("2026.08.19");
    expect(parseVersionOutput("1.32.14\n")).toBe("1.32.14");
    expect(parseVersionOutput("monolith 2.10.1")).toBe("2.10.1");
    expect(parseVersionOutput("deno 2.9.7 (stable, release, aarch64-apple-darwin)\nv8 14.0\ntypescript 5.9.2")).toBe(
      "2.9.7",
    );
    expect(parseVersionOutput("spotdl 4.4.3")).toBe("4.4.3");
  });

  it("reads only ffmpeg's first line, not the compiler version below it", () => {
    expect(
      parseVersionOutput(
        "ffmpeg version 8.0.1 Copyright (c) 2000-2025 the FFmpeg developers\nbuilt with Apple clang version 17.0.0",
      ),
    ).toBe("8.0.1");
    expect(parseVersionOutput("ffmpeg version N-120000-gabcdef Copyright\nbuilt with clang 17.0.0")).toBeUndefined();
  });

  it("returns undefined without a dotted version", () => {
    expect(parseVersionOutput("")).toBeUndefined();
    expect(parseVersionOutput("command not found")).toBeUndefined();
  });
});

describe("compareVersions", () => {
  it("compares dotted versions numerically", () => {
    expect(compareVersions("1.32.1", "1.32.14")).toBe(-1);
    expect(compareVersions("2.10.1", "2.9.7")).toBe(1);
    expect(compareVersions("8.0.1", "9.0.2")).toBe(-1);
  });

  it("treats zero padding, missing parts and Homebrew revisions as equal", () => {
    expect(compareVersions("2026.08.19", "2026.8.19_1")).toBe(0);
    expect(compareVersions("8.0", "8.0.0")).toBe(0);
    expect(compareVersions("8.0.1_2", "8.0.1_3")).toBe(0);
  });

  it("is undefined when either side has no version", () => {
    expect(compareVersions("", "1.0")).toBeUndefined();
    expect(compareVersions("1.0", "unknown")).toBeUndefined();
  });
});

describe("toolsToCheck / packageFor", () => {
  it("maps ffprobe onto ffmpeg and drops duplicates", () => {
    expect(toolsToCheck(["yt-dlp", "ffmpeg", "ffprobe", "deno"])).toEqual(["yt-dlp", "ffmpeg", "deno"]);
    expect(toolsToCheck(["spotdl", "ffmpeg"])).toEqual(["spotdl", "ffmpeg"]);
  });

  it("checks ffmpeg on Windows too, as its own winget package", () => {
    expect(toolsToCheck(["yt-dlp", "ffmpeg", "ffprobe", "deno"])).toEqual(["yt-dlp", "ffmpeg", "deno"]);
    expect(packageFor("ffmpeg", "win32")).toBe("yt-dlp.FFmpeg");
  });

  it("ignores names that are not tools", () => {
    expect(toolsToCheck(["brew", "gallery-dl"])).toEqual(["gallery-dl"]);
  });

  it("names the package each platform upgrades", () => {
    expect(packageFor("gallery-dl", "darwin")).toBe("gallery-dl");
    expect(packageFor("gallery-dl", "win32")).toBe("mikf.gallery-dl");
    expect(packageFor("spotdl", "win32")).toBe("spotdl");
  });
});

describe("pendingUpdates", () => {
  it("lists tools with a newer version available", () => {
    expect(
      pendingUpdates(
        ["gallery-dl", "ffmpeg", "deno"],
        { "gallery-dl": "1.32.1", ffmpeg: "8.0.1", deno: "2.9.7" },
        { "gallery-dl": "1.32.14", ffmpeg: "9.0.2_0" },
        NOW,
      ),
    ).toEqual([
      { tool: "gallery-dl", installed: "1.32.1", latest: "1.32.14" },
      { tool: "ffmpeg", installed: "8.0.1", latest: "9.0.2_0" },
    ]);
  });

  it("drops a tool the user already upgraded since the cached check", () => {
    expect(pendingUpdates(["gallery-dl"], { "gallery-dl": "1.32.14" }, { "gallery-dl": "1.32.14" }, NOW)).toEqual([]);
  });

  it("trusts the package manager when the installed version can't be read", () => {
    expect(pendingUpdates(["monolith"], {}, { monolith: "2.11.0" }, NOW)).toEqual([
      { tool: "monolith", installed: undefined, latest: "2.11.0" },
    ]);
  });

  it("flags a yt-dlp older than 90 days even without a known newer version", () => {
    expect(pendingUpdates(["yt-dlp"], { "yt-dlp": "2026.03.17" }, {}, NOW)).toEqual([
      { tool: "yt-dlp", installed: "2026.03.17", ageDays: 196 },
    ]);
    expect(pendingUpdates(["yt-dlp"], { "yt-dlp": "2026.08.19" }, {}, NOW)).toEqual([]);
  });
});

describe("describeUpdate", () => {
  it("shows the version jump, or yt-dlp's age when no newer version is known", () => {
    expect(describeUpdate({ tool: "gallery-dl", installed: "1.32.1", latest: "1.32.14" })).toBe(
      "gallery-dl 1.32.1 → 1.32.14",
    );
    expect(describeUpdate({ tool: "ffmpeg", installed: "8.0.1", latest: "9.0.2_0" })).toBe("ffmpeg 8.0.1 → 9.0.2");
    expect(describeUpdate({ tool: "deno", installed: undefined, latest: "2.9.8" })).toBe("Deno → 2.9.8");
    expect(describeUpdate({ tool: "yt-dlp", installed: "2026.03.17", ageDays: 196 })).toBe(
      "yt-dlp 2026.03.17 (6 months old)",
    );
  });
});

describe("serializeLatest / readCachedLatest", () => {
  it("round-trips a fresh check", () => {
    const raw = serializeLatest({ "gallery-dl": "1.32.14" }, NOW);
    expect(readCachedLatest(raw, NOW + 1000)).toEqual({ "gallery-dl": "1.32.14" });
  });

  it("expires after the TTL and rejects clock skew or junk", () => {
    const raw = serializeLatest({}, NOW);
    expect(CHECK_TTL_MS).toBe(6 * 60 * 60 * 1000);
    expect(readCachedLatest(raw, NOW + CHECK_TTL_MS + 1)).toBeUndefined();
    expect(readCachedLatest(raw, NOW - 60_000)).toBeUndefined();
    expect(readCachedLatest(undefined, NOW)).toBeUndefined();
    expect(readCachedLatest("{not json", NOW)).toBeUndefined();
    expect(readCachedLatest(JSON.stringify({ checkedAt: NOW }), NOW)).toBeUndefined();
  });
});

describe("singleFlight", () => {
  it("shares one run between calls made while it's in progress", async () => {
    let runs = 0;
    let finish: (v: string) => void = () => undefined;
    const check = singleFlight(() => {
      runs++;
      return new Promise<string>((resolve) => (finish = resolve));
    });
    const first = check();
    const second = check();
    finish("done");
    expect(await first).toBe("done");
    expect(await second).toBe("done");
    expect(runs).toBe(1);
  });

  it("starts a new run once the previous one has settled, even after a failure", async () => {
    let runs = 0;
    const check = singleFlight(async () => {
      runs++;
      if (runs === 1) throw new Error("boom");
      return "ok";
    });
    await expect(check()).rejects.toThrow("boom");
    expect(await check()).toBe("ok");
    expect(runs).toBe(2);
  });
});

describe("withTimeout", () => {
  it("passes a result through when it arrives in time", async () => {
    expect(await withTimeout(Promise.resolve("done"), 1000, "late")).toBe("done");
  });

  it("gives up with the fallback when the work takes too long", async () => {
    const never = new Promise<string>(() => undefined);
    expect(await withTimeout(never, 10, "late")).toBe("late");
  });

  it("uses the fallback when the work fails", async () => {
    expect(await withTimeout(Promise.reject(new Error("boom")), 1000, "failed")).toBe("failed");
  });
});

describe("isPackageManagerInstall", () => {
  it("accepts any Homebrew keg on macOS", () => {
    expect(isPackageManagerInstall("/opt/homebrew/Cellar/yt-dlp/2026.3.17_2/bin/yt-dlp", "darwin")).toBe(true);
    expect(isPackageManagerInstall("/usr/local/Cellar/ffmpeg/8.0.1/bin/ffprobe", "darwin")).toBe(true);
  });

  it("rejects hand-placed binaries on macOS", () => {
    expect(isPackageManagerInstall("/usr/local/bin/yt-dlp", "darwin")).toBe(false);
    expect(isPackageManagerInstall("/Users/me/.local/bin/gallery-dl", "darwin")).toBe(false);
  });

  it("accepts a winget install on Windows and rejects others", () => {
    expect(
      isPackageManagerInstall(
        "C:\\Users\\me\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe",
        "win32",
      ),
    ).toBe(true);
    expect(isPackageManagerInstall("C:\\tools\\yt-dlp.exe", "win32")).toBe(false);
  });

  it("is false on platforms without a supported package manager", () => {
    expect(isPackageManagerInstall("/usr/bin/yt-dlp", "linux")).toBe(false);
  });
});

describe.skipIf(process.platform === "win32")("getToolVersion", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tool-version-"));
  const script = (name: string, body: string) => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
    return file;
  };

  it("parses the --version banner", async () => {
    expect(await getToolVersion(script("monolith", 'echo "monolith 2.10.1"'), "monolith")).toBe("2.10.1");
  });

  it("asks ffmpeg with -version, which is the flag it understands", async () => {
    const ffmpeg = script("ffmpeg", '[ "$1" = "-version" ] && echo "ffmpeg version 8.0.1 Copyright" || exit 1');
    expect(await getToolVersion(ffmpeg, "ffmpeg")).toBe("8.0.1");
  });

  it("returns undefined when the binary is missing or fails", async () => {
    expect(await getToolVersion(path.join(dir, "missing"), "deno")).toBeUndefined();
    expect(await getToolVersion(script("fails", "exit 1"), "deno")).toBeUndefined();
  });
});
