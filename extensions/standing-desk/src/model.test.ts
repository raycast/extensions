import { describe, expect, it } from "vitest";
import {
  DEFAULT_SIT_HEIGHT,
  DEFAULT_STAND_HEIGHT,
  formatHeight,
  parseHeight,
  validateConfiguration,
  validateTarget,
} from "./model";

const configuration = {
  deskName: "Desk",
  baseHeight: 62,
  minimumHeight: 62,
  maximumHeight: 127,
  stepHeight: 1,
};

describe("standing desk model", () => {
  it("uses the requested preset defaults", () => {
    expect(DEFAULT_SIT_HEIGHT).toBe(70);
    expect(DEFAULT_STAND_HEIGHT).toBe(110);
  });

  it("accepts decimal commas", () => {
    expect(parseHeight("99,5", "Height")).toBe(99.5);
  });

  it("rejects blank heights instead of parsing them as zero", () => {
    expect(() => parseHeight("", "Base Height")).toThrow(
      "Base Height must be a number",
    );
    expect(() => parseHeight("   ", "Base Height")).toThrow(
      "Base Height must be a number",
    );
  });

  it("rejects targets outside the configured range", () => {
    expect(() => validateTarget(61.9, configuration)).toThrow(
      "between 62.0 cm and 127.0 cm",
    );
    expect(() => validateTarget(127.1, configuration)).toThrow(
      "between 62.0 cm and 127.0 cm",
    );
  });

  it("rounds valid targets to one decimal place", () => {
    expect(validateTarget(100.04, configuration)).toBe(100);
    expect(validateTarget(100.06, configuration)).toBe(100.1);
  });

  it("rejects an invalid configuration", () => {
    expect(() =>
      validateConfiguration({ ...configuration, minimumHeight: 130 }),
    ).toThrow("Minimum Height must be lower than Maximum Height");
  });

  it("rejects non-positive desk geometry", () => {
    expect(() =>
      validateConfiguration({ ...configuration, baseHeight: 0 }),
    ).toThrow("must be above 0 cm");
  });

  it("formats centimeters consistently", () => {
    expect(formatHeight(70)).toBe("70.0 cm");
  });
});
