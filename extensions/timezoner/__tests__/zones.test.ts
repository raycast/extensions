import { describe, expect, it } from "vitest";
import type { ZoneInfo } from "../src/types";
import { addZone, parseStoredZones, removeZone } from "../src/zones";

describe("zones", () => {
  it("adds zones and replaces duplicates by timezone", () => {
    const zones: ZoneInfo[] = [{ label: "SF", timezone: "America/Los_Angeles" }];

    expect(
      addZone(zones, { label: "San Francisco", timezone: "America/Los_Angeles" }),
    ).toEqual([{ label: "San Francisco", timezone: "America/Los_Angeles" }]);
  });

  it("removes zones by label case-insensitively", () => {
    const zones: ZoneInfo[] = [
      { label: "SF", timezone: "America/Los_Angeles" },
      { label: "NYC", timezone: "America/New_York" },
    ];

    expect(removeZone(zones, "sf")).toEqual([
      { label: "NYC", timezone: "America/New_York" },
    ]);
  });

  it("removes zones by timezone case-insensitively", () => {
    const zones: ZoneInfo[] = [
      { label: "SF", timezone: "America/Los_Angeles" },
      { label: "NYC", timezone: "America/New_York" },
    ];

    expect(removeZone(zones, "america/new_york")).toEqual([
      { label: "SF", timezone: "America/Los_Angeles" },
    ]);
  });

  it("parses valid stored zones", () => {
    expect(
      parseStoredZones(
        JSON.stringify([{ label: "Tokyo", timezone: "Asia/Tokyo" }]),
      ),
    ).toEqual([{ label: "Tokyo", timezone: "Asia/Tokyo" }]);
  });

  it("rejects stored zones with malformed items", () => {
    expect(
      parseStoredZones(JSON.stringify([{ label: "Tokyo", timezone: 7 }])),
    ).toBeUndefined();
  });

  it("rejects stored zones with invalid timezones", () => {
    expect(
      parseStoredZones(
        JSON.stringify([{ label: "Tokyo", timezone: "Not/A_Timezone" }]),
      ),
    ).toBeUndefined();
  });

  it("rejects invalid JSON", () => {
    expect(parseStoredZones("{nope")).toBeUndefined();
  });

  // LocalStorage is intentionally exercised through Raycast build/runtime.
  // Vitest cannot resolve @raycast/api's extension-only package entry reliably.
});
