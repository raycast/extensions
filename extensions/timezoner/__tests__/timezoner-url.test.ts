import { describe, expect, it } from "vitest";
import { buildTimeZonerURL } from "../src/timezoner-url";

describe("buildTimeZonerURL", () => {
  it("returns open URL when no conversion is provided", () => {
    expect(buildTimeZonerURL()).toBe("timezoner://open");
  });

  it("builds encoded set URL for conversion queries", () => {
    expect(
      buildTimeZonerURL({
        kind: "conversion",
        hour: 15,
        minute: 30,
        sourceTimezone: "America/Los_Angeles",
        sourceLabel: "SF",
      }),
    ).toBe(
      "timezoner://set?hour=15&minute=30&zone=America%2FLos_Angeles&label=SF",
    );
  });

  it("percent-encodes labels with spaces", () => {
    expect(
      buildTimeZonerURL({
        kind: "conversion",
        hour: 9,
        minute: 5,
        sourceTimezone: "America/New_York",
        sourceLabel: "New York",
      }),
    ).toBe(
      "timezoner://set?hour=9&minute=5&zone=America%2FNew_York&label=New%20York",
    );
  });
});
