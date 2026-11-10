import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { homebrewMise } from "../../test/homebrewMise";
import { findMiseUpdate, installMethod, newerRelease, updateCommand } from "./update";

const home = "/Users/me";

describe("installMethod", () => {
  it.each([
    ["/opt/homebrew/bin/mise", "/opt/homebrew/Cellar/mise/2026.10.15/bin/mise"],
    ["/usr/local/bin/mise", "/usr/local/Cellar/mise/2026.10.15/bin/mise"],
    ["/home/linuxbrew/.linuxbrew/bin/mise", "/home/linuxbrew/.linuxbrew/Cellar/mise/2026.10.15/bin/mise"],
    ["/opt/homebrew/bin/mise", undefined],
    ["/Users/me/bin/mise", "/opt/homebrew/Cellar/mise/2026.10.15/bin/mise"],
  ])("treats %s (realpath %s) as Homebrew", (path, realPath) => {
    expect(installMethod({ path, realPath, home })).toBe("homebrew");
  });

  it("treats ~/.local/bin/mise, a link to it, and $MISE_INSTALL_PATH as self-managed", () => {
    expect(installMethod({ path: "/Users/me/.local/bin/mise", realPath: "/Users/me/.local/bin/mise", home })).toBe(
      "self-managed",
    );
    expect(installMethod({ path: "/usr/local/bin/mise", realPath: "/Users/me/.local/bin/mise", home })).toBe(
      "self-managed",
    );
    expect(installMethod({ path: "/opt/tools/mise", home, installPath: "/opt/tools/mise" })).toBe("self-managed");
  });

  it.each([
    ["/usr/local/bin/mise", "/usr/local/bin/mise"],
    ["/Users/me/.cargo/bin/mise", "/Users/me/.cargo/bin/mise"],
    ["/run/current-system/sw/bin/mise", "/nix/store/abc-mise-2026.10.15/bin/mise"],
    ["/Users/other/.local/bin/mise", undefined],
  ])("does not guess for %s (realpath %s)", (path, realPath) => {
    expect(installMethod({ path, realPath, home })).toBe("unknown");
  });
});

describe("updateCommand", () => {
  it("uses brew for Homebrew, self-update on the resolved binary for self-managed, and nothing otherwise", () => {
    const location = { path: "/Users/me/.local/bin/mise" };
    expect(updateCommand("homebrew", location)).toEqual(["brew", "upgrade", "mise"]);
    expect(updateCommand("self-managed", location)).toEqual(["/Users/me/.local/bin/mise", "self-update", "--yes"]);
    expect(updateCommand("unknown", location)).toBeUndefined();
  });
});

describe("newerRelease", () => {
  it("returns latest only when it is newer than the running version", () => {
    expect(newerRelease({ version: "2026.10.15", latest: "2026.10.25" })).toBe("2026.10.25");
    expect(newerRelease({ version: "2026.10.15", latest: "2026.11.0" })).toBe("2026.11.0");
    expect(newerRelease({ version: "2026.10.25", latest: "2026.10.25" })).toBeUndefined();
    expect(newerRelease({ version: "2026.11.0", latest: "2026.10.25" })).toBeUndefined();
    expect(newerRelease({ version: "2026.10.15" })).toBeUndefined();
    expect(newerRelease(undefined)).toBeUndefined();
  });
});

describe("findMiseUpdate", () => {
  const makeHomebrewMise = homebrewMise();
  const env = { PATH: "/bin", MISE_YES: "1", NO_COLOR: "1" } as const;
  const version = { version: "2026.10.15", latest: "2026.10.25" };

  it("follows a Homebrew symlink into the Cellar", () => {
    expect(findMiseUpdate({ path: makeHomebrewMise(), env, version })).toEqual({
      current: "2026.10.15",
      latest: "2026.10.25",
      argv: ["brew", "upgrade", "mise"],
    });
  });

  it("self-updates the binary at $MISE_INSTALL_PATH and links to the docs for anything else", () => {
    const installEnv = { ...env, MISE_INSTALL_PATH: "/opt/tools/mise" };
    expect(findMiseUpdate({ path: "/opt/tools/mise", env: installEnv, version })?.argv).toEqual([
      "/opt/tools/mise",
      "self-update",
      "--yes",
    ]);
    expect(findMiseUpdate({ path: join(homedir(), ".local/bin/mise"), env, version })?.argv).toEqual([
      join(homedir(), ".local/bin/mise"),
      "self-update",
      "--yes",
    ]);
    expect(findMiseUpdate({ path: "/bin/sh", env, version })).toEqual({ current: "2026.10.15", latest: "2026.10.25" });
  });

  it("finds nothing when latest is missing, not newer, or the version is unknown", () => {
    expect(findMiseUpdate({ path: "/bin/sh", env, version: { version: "2026.10.15" } })).toBeUndefined();
    expect(findMiseUpdate({ path: "/bin/sh", env, version: { version: "2026.10.25", latest: "2026.10.25" } })).toBe(
      undefined,
    );
    expect(findMiseUpdate({ path: "/bin/sh", env })).toBeUndefined();
  });
});
