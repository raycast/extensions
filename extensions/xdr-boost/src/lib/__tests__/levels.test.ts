import { describe, expect, it } from "vitest";
import { indexOfLevel, levelFromPreference, levelLabel, LEVELS, parseLevel, presetAt, stepLevel } from "../levels";

describe("levels", () => {
  it("labels presets with two decimals, Off bare, and anything else as Custom", () => {
    expect(LEVELS.map((l) => levelLabel(l.value))).toEqual(["Off", "Low 1.19", "Medium 1.38", "High 1.56", "Max 1.75"]);
    expect(levelLabel(1.5)).toBe("Custom 1.50");
  });

  it("maps the preference, defaulting to High", () => {
    expect(levelFromPreference("low").value).toBe(1.1875);
    expect(levelFromPreference("max").value).toBe(1.75);
    expect(levelFromPreference(undefined).name).toBe("High");
    expect(levelFromPreference("bogus").name).toBe("High");
  });

  it("finds the nearest preset for the icon, treating ≤ 1.0 and undefined as Off", () => {
    expect(indexOfLevel(undefined)).toBe(0);
    expect(indexOfLevel(0.5)).toBe(0);
    expect(indexOfLevel(1.56)).toBe(3);
    expect(indexOfLevel(2)).toBe(4);
  });

  it("matches a preset only exactly", () => {
    expect(presetAt(1.5625)?.name).toBe("High");
    expect(presetAt(1.5)).toBeUndefined();
    expect(presetAt(undefined)?.name).toBe("Off");
  });

  it("steps to the next preset strictly above or below, clamped at both ends", () => {
    expect(stepLevel(1.0, 1).name).toBe("Low");
    expect(stepLevel(1.1875, -1).name).toBe("Off");
    expect(stepLevel(1.0, -1).name).toBe("Off");
    expect(stepLevel(1.75, 1).name).toBe("Max");
    // From a custom level: up goes to the next preset above, down to the next below.
    expect(stepLevel(1.5, 1).name).toBe("High");
    expect(stepLevel(1.5, -1).name).toBe("Medium");
  });

  it("never calls a running level Off, and steps from the exact value (Codex F5)", () => {
    expect(presetAt(1.0005)).toBeUndefined();
    expect(levelLabel(1.0005)).toBe("Custom 1.0005");
    expect(stepLevel(1.187, 1).name).toBe("Low");
    expect(stepLevel(1.7495, 1).name).toBe("Max");
    expect(presetAt(1.1875)?.name).toBe("Low");
  });

  it("parses preset names, levels and percents; rejects anything out of range", () => {
    expect(parseLevel("High")).toBe(1.5625);
    expect(parseLevel(" off ")).toBe(1.0);
    expect(parseLevel("1.5")).toBe(1.5);
    expect(parseLevel("50%")).toBe(1.375);
    expect(parseLevel("100 %")).toBe(1.75);
    expect(parseLevel("0%")).toBe(1);
    expect(parseLevel("2")).toBeUndefined();
    expect(parseLevel("120%")).toBeUndefined();
    expect(parseLevel("0.5")).toBeUndefined();
    expect(parseLevel("bright")).toBeUndefined();
    expect(parseLevel("")).toBeUndefined();
  });
});
