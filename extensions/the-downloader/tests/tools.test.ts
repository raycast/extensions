import { describe, it, expect, vi, afterEach } from "vitest";

// HOMEBREW_FORMULAE / WINGET_PACKAGES are derived at module-load time from
// `isWindows` (binary.ts), so re-import tools.ts with binary mocked per platform.
async function loadTools(isWindows: boolean) {
  vi.resetModules();
  vi.doMock("../src/lib/binary", () => ({ isWindows, isMac: !isWindows }));
  return import("../src/lib/tools");
}

afterEach(() => {
  vi.doUnmock("../src/lib/binary");
  vi.resetModules();
});

describe("package-manager mapping helpers (platform-independent)", () => {
  it("homebrewFormulaFor maps ffprobe to ffmpeg and others to themselves", async () => {
    const { homebrewFormulaFor } = await loadTools(false);
    expect(homebrewFormulaFor("ffprobe")).toBe("ffmpeg");
    expect(homebrewFormulaFor("yt-dlp")).toBe("yt-dlp");
    expect(homebrewFormulaFor("spotdl")).toBe("spotdl");
  });

  it("wingetIdFor returns the package id or falls back to yt-dlp.yt-dlp", async () => {
    const { wingetIdFor } = await loadTools(true);
    expect(wingetIdFor("monolith")).toBe("Y2Z.Monolith");
    expect(wingetIdFor("gallery-dl")).toBe("mikf.gallery-dl");
    // ffprobe has no winget package of its own — yt-dlp bundles it on Windows.
    expect(wingetIdFor("ffprobe")).toBe("yt-dlp.yt-dlp");
  });

  it("friendlyNameFor reverse-maps a winget id and passes unknowns through", async () => {
    const { friendlyNameFor } = await loadTools(true);
    expect(friendlyNameFor("Y2Z.Monolith")).toBe("monolith");
    expect(friendlyNameFor("DenoLand.Deno")).toBe("deno");
    expect(friendlyNameFor("ffmpeg")).toBe("ffmpeg");
  });

  it("isManagedTool is true only for the spotdl managed binary", async () => {
    const { isManagedTool } = await loadTools(false);
    expect(isManagedTool("spotdl")).toBe(true);
    expect(isManagedTool("yt-dlp")).toBe(false);
    expect(isManagedTool("monolith")).toBe(false);
  });
});

describe("derived package lists", () => {
  it("on Windows, WINGET_PACKAGES is deduped and excludes the managed spotdl", async () => {
    const { WINGET_PACKAGES } = await loadTools(true);
    expect(WINGET_PACKAGES).toEqual(
      expect.arrayContaining(["yt-dlp.yt-dlp", "mikf.gallery-dl", "DenoLand.Deno", "Y2Z.Monolith"]),
    );
    expect(WINGET_PACKAGES).not.toContain("spotdl");
    expect(new Set(WINGET_PACKAGES).size).toBe(WINGET_PACKAGES.length);
  });

  it("on macOS, HOMEBREW_FORMULAE covers the package-managed tools and excludes spotdl", async () => {
    const { HOMEBREW_FORMULAE } = await loadTools(false);
    expect(HOMEBREW_FORMULAE).toEqual(expect.arrayContaining(["yt-dlp", "ffmpeg", "gallery-dl", "deno", "monolith"]));
    expect(HOMEBREW_FORMULAE).not.toContain("spotdl");
  });
});
