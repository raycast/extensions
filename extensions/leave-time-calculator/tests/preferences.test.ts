import { describe, expect, test } from "vitest";
import { resolveWorkPreferences } from "../src/lib/preferences";

describe("resolveWorkPreferences", () => {
  test("accepts valid decimal work hours and integer break minutes", () => {
    expect(resolveWorkPreferences("7.5", "45")).toEqual({
      workHours: 7.5,
      breakMinutes: 45,
    });
  });

  test.each([
    ["Infinity", "60"],
    ["0", "60"],
    ["-1", "60"],
    ["7.333", "60"],
  ])("uses default work hours for invalid value %s", (workHours, breakMinutes) => {
    expect(resolveWorkPreferences(workHours, breakMinutes).workHours).toBe(8);
  });

  test.each([
    ["8", "Infinity"],
    ["8", "-1"],
    ["8", "30.5"],
  ])("uses default break minutes for invalid value %s", (workHours, breakMinutes) => {
    expect(resolveWorkPreferences(workHours, breakMinutes).breakMinutes).toBe(60);
  });

  test("uses defaults when the total shift duration reaches 24 hours", () => {
    expect(resolveWorkPreferences("23", "60")).toEqual({
      workHours: 8,
      breakMinutes: 60,
    });
  });
});
