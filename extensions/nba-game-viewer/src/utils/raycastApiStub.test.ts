import { describe, expect, it } from "vitest";
import { getPreferenceValues } from "@raycast/api";

// Controls for the test harness this branch adds rather than for the fix: it
// is the only file that imports `@raycast/api` without replacing it through
// `vi.mock`, so it pins the vitest alias that makes the specifier resolvable
// outside the Raycast runtime, and pins the stand-in to the DECLARED
// preference defaults. An empty object would read every preference as
// `undefined` and let the other tests pass through branches the shipped
// defaults never reach.
describe("raycast-api stand-in", () => {
  it("reads the number of score days from the declared preference default (control: harness only)", () => {
    expect(getPreferenceValues<Preferences>().numDaysScores).toBe("7");
  });

  it("reads the remaining preferences from their declared defaults, not an empty object (control: harness only)", () => {
    expect(getPreferenceValues()).toMatchObject({
      conference: "eastern",
      league: "nba",
      useLastValue: false,
      showDetails: false,
    });
  });
});
