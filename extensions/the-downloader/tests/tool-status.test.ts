import { describe, it, expect } from "vitest";
import { displayVersion, toolStatus, versionReport } from "../src/lib/tool-status";

describe("toolStatus", () => {
  const versions = { "yt-dlp": "2026.08.19", ffmpeg: "8.0", deno: "not installed", monolith: "" };

  it("reports current, outdated, missing and still-checking tools", () => {
    expect(toolStatus("ffmpeg", versions, {}, [], [])).toEqual({ kind: "current", version: "8.0" });
    expect(toolStatus("yt-dlp", versions, { "yt-dlp": "2026.09.20" }, [], [])).toEqual({
      kind: "outdated",
      version: "2026.08.19",
      latest: "2026.09.20",
    });
    expect(toolStatus("deno", versions, {}, [], [])).toEqual({ kind: "missing" });
    expect(toolStatus("monolith", versions, {}, [], [])).toEqual({ kind: "checking" });
  });

  it("lets failures win over the version state", () => {
    expect(toolStatus("ffmpeg", versions, {}, [{ pkg: "ffmpeg", message: "boom" }], [])).toMatchObject({
      kind: "check-failed",
      message: "boom",
    });
    expect(
      toolStatus(
        "yt-dlp",
        versions,
        { "yt-dlp": "x" },
        [{ pkg: "yt-dlp", message: "a" }],
        [{ pkg: "yt-dlp", message: "b" }],
      ),
    ).toMatchObject({ kind: "upgrade-failed", message: "b" });
  });
});

describe("versionReport", () => {
  it("summarizes every tool on its own line", () => {
    expect(
      versionReport([
        { name: "yt-dlp", status: { kind: "outdated", version: "1", latest: "2" } },
        { name: "Deno", status: { kind: "missing" } },
      ]),
    ).toBe("yt-dlp: 1 (update available: 2)\nDeno: not installed");
  });
});

describe("displayVersion", () => {
  it("shows FFmpeg for yt-dlp's nightly build by its date, so the row's status still fits", () => {
    expect(displayVersion("N-127043-g5a54fcf75e-20260930")).toBe("2026.09.30");
  });

  it("leaves every other version as it is", () => {
    expect(displayVersion("2026.10.21")).toBe("2026.10.21");
    expect(displayVersion("8.0")).toBe("8.0");
    expect(displayVersion("< 1.32.0")).toBe("< 1.32.0");
  });
});
