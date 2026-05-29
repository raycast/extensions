import { describe, it, expect, vi } from "vitest";
import * as os from "node:os";

// utils.ts destructures getPreferenceValues() and imports `environment` at
// module load. `@raycast/api` is aliased to tests/stubs/raycast-api.ts (see
// vitest.config.ts), which supplies downloadPath "~/Downloads" and
// networkIdleTimeoutSec "120".
import { sanitizeVideoTitle, expandTilde, getIdleTimeoutMs, formatFilesize, parseHHMM, isValidHHMM } from "../src/utils";

const originalPlatform = process.platform;
function setPlatform(platform: NodeJS.Platform) {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
}
function restorePlatform() {
  Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
}

/** Re-import utils with process.platform mocked so `isWindows` (computed at binary.ts load) flips. */
async function loadUtilsForPlatform(platform: NodeJS.Platform) {
  vi.resetModules();
  setPlatform(platform);
  try {
    return await import("../src/utils");
  } finally {
    restorePlatform();
  }
}

describe("sanitizeVideoTitle (host platform = macOS)", () => {
  it("strips forward slashes so 'AC/DC' can't become a subpath", () => {
    expect(sanitizeVideoTitle("AC/DC - Thunderstruck")).toBe("ACDC - Thunderstruck");
  });

  it("strips backslashes", () => {
    expect(sanitizeVideoTitle("foo\\bar")).toBe("foobar");
  });

  it("strips colons on macOS", () => {
    expect(sanitizeVideoTitle("Episode 1: The Beginning")).toBe("Episode 1 The Beginning");
  });

  it("collapses leading dots so '..\\/etc' can't traverse", () => {
    // Separators are stripped first ("../etc" -> "..etc"), then leading dots.
    expect(sanitizeVideoTitle("../etc/passwd")).toBe("etcpasswd");
  });

  it("removes control characters", () => {
    expect(sanitizeVideoTitle("abc")).toBe("abc");
  });

  it("collapses runs of spaces to a single space", () => {
    expect(sanitizeVideoTitle("a    b     c")).toBe("a b c");
  });

  it("removes control characters such as tabs entirely", () => {
    // Tab is char code 9 (< 32) so it is filtered out, not turned into a space.
    expect(sanitizeVideoTitle("a\tb")).toBe("ab");
  });

  it("falls back to 'untitled' for an all-stripped title", () => {
    expect(sanitizeVideoTitle("///")).toBe("untitled");
    expect(sanitizeVideoTitle("   ")).toBe("untitled");
    expect(sanitizeVideoTitle("...")).toBe("untitled");
  });

  it("truncates at the last sentence-ending punctuation within the max length", () => {
    const long = "First sentence. " + "x".repeat(300);
    expect(sanitizeVideoTitle(long)).toBe("First sentence");
  });
});

describe("sanitizeVideoTitle (Windows reserved set)", () => {
  it("strips the full Windows-reserved character set", async () => {
    const utilsWin = await loadUtilsForPlatform("win32");
    expect(utilsWin.sanitizeVideoTitle('a<b>c:d"e/f\\g|h?i*j')).toBe("abcdefghij");
  });

  it("still strips separators on Windows (the always-invalid set)", async () => {
    const utilsWin = await loadUtilsForPlatform("win32");
    expect(utilsWin.sanitizeVideoTitle("AC/DC")).toBe("ACDC");
  });
});

describe("expandTilde", () => {
  it("expands a leading ~/ to the home directory", () => {
    expect(expandTilde("~/Downloads")).toBe(`${os.homedir()}/Downloads`);
  });

  it("expands a bare ~", () => {
    expect(expandTilde("~")).toBe(os.homedir());
  });

  it("leaves absolute paths unchanged", () => {
    expect(expandTilde("/Users/me/Movies")).toBe("/Users/me/Movies");
  });

  it("leaves ~user-style specs (no separator after tilde) untouched", () => {
    expect(expandTilde("~bob/x")).toBe("~bob/x");
  });
});

describe("getIdleTimeoutMs", () => {
  it("converts a valid seconds preference to milliseconds", () => {
    // The mocked preference is "120" -> 120000ms.
    expect(getIdleTimeoutMs()).toBe(120000);
  });
});

describe("formatFilesize", () => {
  it("returns '' for falsy sizes", () => {
    expect(formatFilesize(undefined, undefined)).toBe("");
    expect(formatFilesize(0)).toBe("");
  });

  it("formats across unit boundaries", () => {
    expect(formatFilesize(512)).toBe("512 B");
    expect(formatFilesize(1536)).toBe("1.50 KiB");
    expect(formatFilesize(1024 ** 2 * 2)).toBe("2.00 MiB");
    expect(formatFilesize(1024 ** 3 * 3)).toBe("3.00 GiB");
  });

  it("falls back to the approximate size when exact is absent", () => {
    expect(formatFilesize(undefined, 2048)).toBe("2.00 KiB");
  });
});

describe("parseHHMM / isValidHHMM", () => {
  it("parses MM:SS and HH:MM:SS", () => {
    expect(parseHHMM("01:30")).toBe(90);
    expect(parseHHMM("01:00:00")).toBe(3600);
  });

  it("validates well-formed and rejects malformed input", () => {
    expect(isValidHHMM("01:30")).toBe(true);
    expect(isValidHHMM("")).toBe(true); // empty is treated as valid (no constraint)
    expect(isValidHHMM("not-a-time")).toBe(false);
  });
});
