import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { getTypingSpeed } from "./typing-speed";

const speedPreference = packageJson.preferences.find(({ name }) => name === "humanCadenceSpeed");
const speedValues = (speedPreference?.data ?? []).map(({ value }) => value as Preferences["humanCadenceSpeed"]);

describe("getTypingSpeed", () => {
  it("finds the Typing Speed options in package.json", () => {
    expect(speedValues.length).toBeGreaterThan(0);
  });

  it.each(speedValues)("has delays for the %s option", (humanCadenceSpeed) => {
    const { keyHold, gap } = getTypingSpeed({ humanCadenceSpeed, humanCadence: false, softNewlines: false });
    expect(keyHold).toBeGreaterThan(0);
    expect(gap).toBeGreaterThanOrEqual(0);
  });

  it("only varies the pause when Human Cadence is on", () => {
    const base = { humanCadenceSpeed: "average", softNewlines: false } as const;
    const steady = getTypingSpeed({ ...base, humanCadence: false });
    const human = getTypingSpeed({ ...base, humanCadence: true });

    expect(steady.gapVariance).toBe(0);
    expect(human.gapVariance).toBeGreaterThan(0);
    expect(human.gapVariance).toBeLessThanOrEqual(1);
    expect({ ...human, gapVariance: 0 }).toEqual(steady);
  });
});
