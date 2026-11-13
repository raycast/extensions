import { beforeEach, describe, expect, it, vi } from "vitest";
import * as exec from "./exec";
import { MiseOutputError } from "./exec";
import { atLeast, compareVersions, parseVersion, readVersion } from "./version";

const location = { path: "/bin/sh", env: { PATH: "/bin", MISE_YES: "1", NO_COLOR: "1" } } as const;

describe("parseVersion", () => {
  it("keeps the bare CalVer and the latest release that mise 2026.10.22 and later report", () => {
    expect(
      parseVersion({
        version: "2026.11.0 macos-arm64 (2026-11-01)",
        latest: "2026.11.0",
        os: "macos",
        arch: "arm64",
        build_time: "2026-11-01 08:36:30 +00:00",
      }),
    ).toEqual({ version: "2026.11.0", latest: "2026.11.0" });
  });

  it("leaves latest out for releases that do not report it", () => {
    expect(parseVersion({ version: "2026.10.15 macos-arm64 (2026-10-19)" })).toEqual({ version: "2026.10.15" });
    expect(parseVersion({ version: "2026.10.15 macos-arm64 (2026-10-19)", latest: null })).toEqual({
      version: "2026.10.15",
    });
  });

  it("strips a leading v from latest", () => {
    expect(parseVersion({ version: "2026.10.15", latest: "v2026.11.0" })).toEqual({
      version: "2026.10.15",
      latest: "2026.11.0",
    });
  });

  it("throws MiseOutputError when there is no CalVer to read", () => {
    expect(() => parseVersion("2026.10.15")).toThrow(MiseOutputError);
    expect(() => parseVersion({})).toThrow(MiseOutputError);
    expect(() => parseVersion({ version: "unknown" })).toThrow(MiseOutputError);
  });
});

describe("readVersion", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("runs mise version, whose --json miseJson appends", async () => {
    const miseJson = vi.spyOn(exec, "miseJson").mockResolvedValue({ version: "2026.10.7" });
    expect(await readVersion(location)).toEqual({ version: "2026.10.7" });
    expect(miseJson).toHaveBeenCalledWith(location, ["version"], parseVersion);
  });

  it("is undefined when mise rejects version --json or prints something else", async () => {
    vi.spyOn(exec, "miseJson").mockRejectedValueOnce(new exec.MiseExitError(["version"], 2, "unexpected argument"));
    expect(await readVersion(location)).toBeUndefined();
    vi.spyOn(exec, "miseJson").mockRejectedValueOnce(new MiseOutputError("not JSON", "2026.1.0"));
    expect(await readVersion(location)).toBeUndefined();
  });

  it("is undefined when the binary is not mise", async () => {
    expect(await readVersion({ ...location, path: "/usr/bin/false" })).toBeUndefined();
  });
});

describe("compareVersions", () => {
  it("compares each part as a number", () => {
    expect(compareVersions("2026.10.7", "2026.10.15")).toBe(-1);
    expect(compareVersions("2026.10.15", "2026.10.7")).toBe(1);
    expect(compareVersions("2026.11.0", "2026.10.30")).toBe(1);
    expect(compareVersions("2027.1.0", "2026.12.31")).toBe(1);
    expect(compareVersions("2026.10.7", "2026.10.7")).toBe(0);
  });
});

describe("atLeast", () => {
  it("is true at and after the minimum", () => {
    expect(atLeast({ version: "2026.10.7" }, "2026.10.7")).toBe(true);
    expect(atLeast({ version: "2026.10.15" }, "2026.10.7")).toBe(true);
    expect(atLeast({ version: "2026.11.0" }, "2026.10.7")).toBe(true);
  });

  it("is false before the minimum and when the version is unknown", () => {
    expect(atLeast({ version: "2026.10.6" }, "2026.10.7")).toBe(false);
    expect(atLeast({ version: "2025.12.0" }, "2026.10.7")).toBe(false);
    expect(atLeast(undefined, "2026.10.7")).toBe(false);
  });
});
