import { describe, expect, it } from "vitest";
import { defaultPreferences, mocks } from "../../test/raycast-api";
import { outdatedOptions, parseJobs, readPreferences, upgradeOptions } from "./preferences";

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
    expect(upgradeOptions(prefs)).toEqual({ bump: false, inactive: true, jobs: 2 });
    expect(outdatedOptions(prefs)).toEqual({ bump: false, inactive: true });
  });
});
