import { describe, expect, it } from "vitest";
import { shouldDisplayChangelog, shouldMarkVersionAsSeen } from "../useChangelogVersionGate";

describe("shouldDisplayChangelog", () => {
  it("returns false when no previous version is stored", () => {
    expect(shouldDisplayChangelog(undefined, "1.0.0")).toBe(false);
    expect(shouldDisplayChangelog("", "1.0.0")).toBe(false);
  });

  it("returns false when version has not changed", () => {
    expect(shouldDisplayChangelog("1.0.0", "1.0.0")).toBe(false);
    expect(shouldDisplayChangelog(" 1.0.0 ", "1.0.0")).toBe(false);
  });

  it("returns true when stored version differs from current version", () => {
    expect(shouldDisplayChangelog("0.9.0", "1.0.0")).toBe(true);
    expect(shouldDisplayChangelog("1.0.0", "1.1.0")).toBe(true);
  });
});

describe("shouldMarkVersionAsSeen", () => {
  it("returns false while local storage is loading", () => {
    expect(shouldMarkVersionAsSeen(true, undefined, "1.0.0")).toBe(false);
    expect(shouldMarkVersionAsSeen(true, "0.9.0", "1.0.0")).toBe(false);
  });

  it("returns false when current version is empty or already stored", () => {
    expect(shouldMarkVersionAsSeen(false, "1.0.0", "")).toBe(false);
    expect(shouldMarkVersionAsSeen(false, "1.0.0", "1.0.0")).toBe(false);
    expect(shouldMarkVersionAsSeen(false, " 1.0.0 ", "1.0.0")).toBe(false);
  });

  it("returns true when current version differs and loading is complete", () => {
    expect(shouldMarkVersionAsSeen(false, undefined, "1.0.0")).toBe(true);
    expect(shouldMarkVersionAsSeen(false, "0.9.0", "1.0.0")).toBe(true);
  });
});
