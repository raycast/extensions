import { describe, expect, it } from "vitest";
import { defaultPreferences, mocks } from "../../test/raycast-api";
import { outdatedOptions, parseJobs, readPreferences, upgradeOptions } from "./preferences";

const env = { PATH: "/bin", MISE_YES: "1", NO_COLOR: "1" } as const;
const mise = (version?: string) => ({ path: "/bin/sh", env, version: version ? { version } : undefined });

describe("parseJobs", () => {
  it("accepts a positive integer and nothing else", () => {
    expect(parseJobs("4")).toBe(4);
    expect(parseJobs(" 8 ")).toBe(8);
    expect(parseJobs("")).toBeUndefined();
    expect(parseJobs(undefined)).toBeUndefined();
    expect(parseJobs("0")).toBeUndefined();
    expect(parseJobs("-2")).toBeUndefined();
    expect(parseJobs("2.5")).toBeUndefined();
    expect(parseJobs("eight")).toBeUndefined();
  });
});

describe("readPreferences", () => {
  it("parses jobs to a number and passes the checkboxes through", () => {
    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences, jobs: "4", upgradeBump: true });
    const prefs = readPreferences();
    expect(prefs.jobs).toBe(4);
    expect(prefs.upgradeBump).toBe(true);
    expect(prefs.includeInactive).toBe(false);
    expect(prefs.misePath).toBe("/bin/sh");
  });

  it("maps the upgrade and outdated preferences onto mise flags", () => {
    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences, includeInactive: true, jobs: "2" });
    const prefs = readPreferences();
    expect(upgradeOptions(prefs, mise())).toEqual({ global: false, bump: false, inactive: true, jobs: 2 });
    expect(outdatedOptions(prefs, mise())).toEqual({ global: false, bump: false, inactive: true });
  });

  it("scopes outdated and upgrade to the global config from mise 2026.10.7, which added --global", () => {
    const prefs = readPreferences();
    for (const version of ["2026.10.7", "2026.10.15", "2026.11.0"]) {
      expect(upgradeOptions(prefs, mise(version)).global, version).toBe(true);
      expect(outdatedOptions(prefs, mise(version)).global, version).toBe(true);
    }
    for (const version of ["2026.10.6", "2025.12.0", undefined]) {
      expect(upgradeOptions(prefs, mise(version)).global, version).toBe(false);
      expect(outdatedOptions(prefs, mise(version)).global, version).toBe(false);
    }
  });

  it("leaves --global off under Include inactive tools, since mise rejects it with --inactive", () => {
    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences, includeInactive: true });
    const prefs = readPreferences();
    expect(upgradeOptions(prefs, mise("2026.11.0"))).toMatchObject({ global: false, inactive: true });
    expect(outdatedOptions(prefs, mise("2026.11.0"))).toMatchObject({ global: false, inactive: true });
  });
});
