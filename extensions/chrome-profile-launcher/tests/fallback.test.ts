import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadProfiles } from "../src/lib/chrome-profiles";

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "cpl-fixture-"));
});
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Create an isolated fake Chrome user-data dir for one test. */
function userDataDir(name: string): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}
function profileDir(userData: string, dirName: string, prefsName?: string): void {
  const path = join(userData, dirName);
  mkdirSync(path, { recursive: true });
  if (prefsName !== undefined) {
    writeFileSync(join(path, "Preferences"), JSON.stringify({ profile: { name: prefsName } }));
  }
}
function localState(userData: string, contents: string): void {
  writeFileSync(join(userData, "Local State"), contents);
}

describe("loadProfiles — primary (info_cache)", () => {
  it("reads names, colors, and order; filters ghost directories", async () => {
    const ud = userDataDir("valid");
    profileDir(ud, "Default");
    profileDir(ud, "Profile 1");
    localState(
      ud,
      JSON.stringify({
        profile: {
          info_cache: {
            Default: { name: "My Default", profile_color_seed: -16033840 },
            "Profile 1": { name: "Work", user_name: "w@x.com", profile_color_seed: -14244198 },
            Ghost: { name: "Ghost" }, // no dir on disk → filtered
          },
          profiles_order: ["Profile 1", "Default"],
        },
      }),
    );

    const profiles = await loadProfiles(ud);
    expect(profiles.map((p) => p.directory)).toEqual(["Profile 1", "Default"]); // order honored, Ghost gone
    expect(profiles.find((p) => p.directory === "Default")?.name).toBe("My Default");
    expect(profiles.find((p) => p.directory === "Profile 1")?.color).toBe("#26A69A");
    expect(profiles.find((p) => p.directory === "Profile 1")?.email).toBe("w@x.com");
  });

  it("skips a malformed info_cache entry without throwing", async () => {
    const ud = userDataDir("partial");
    profileDir(ud, "Default");
    profileDir(ud, "Profile 1");
    localState(ud, JSON.stringify({ profile: { info_cache: { Default: { name: "Good" }, "Profile 1": "nope" } } }));

    const profiles = await loadProfiles(ud);
    expect(profiles.map((p) => p.directory)).toEqual(["Default"]);
  });
});

describe("loadProfiles — fallback (directory scan)", () => {
  it("falls back to a directory scan when Local State is invalid JSON", async () => {
    const ud = userDataDir("malformed");
    localState(ud, "{ this is not valid json ");
    profileDir(ud, "Default", "Scanned Default");
    profileDir(ud, "Work", "Scanned Work"); // custom-named dir a glob would miss
    mkdirSync(join(ud, "GrShaderCache"), { recursive: true }); // non-profile: no Preferences

    const profiles = await loadProfiles(ud);
    expect(profiles.map((p) => p.name).sort()).toEqual(["Scanned Default", "Scanned Work"]);
    expect(profiles.every((p) => p.colorSource === "generated")).toBe(true);
  });

  it("falls back when Local State is missing and excludes internal profiles", async () => {
    const ud = userDataDir("missing");
    profileDir(ud, "Default", "Only Default");
    profileDir(ud, "System Profile", "System"); // internal → excluded

    const profiles = await loadProfiles(ud);
    expect(profiles.map((p) => p.directory)).toEqual(["Default"]);
  });

  it("returns an empty list (never throws) when the data dir does not exist", async () => {
    await expect(loadProfiles(join(root, "does-not-exist"))).resolves.toEqual([]);
  });
});
