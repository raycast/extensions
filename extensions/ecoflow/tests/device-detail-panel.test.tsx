import { describe, expect, it } from "vitest";
import { buildDeviceSummaryMarkdown } from "../src/utils/device-summary";
import type { DeviceSnapshot } from "../src/types/device";

const unknownProfile = {
  family: "unknown" as const,
  displayName: "EcoFlow Device",
  category: "unknown" as const,
  prefixes: [],
  searchTerms: [],
};

function device(overrides: Partial<DeviceSnapshot> = {}): DeviceSnapshot {
  return {
    serialNumber: "UNKNOWN1234",
    name: "Unknown Device",
    online: true,
    profile: unknownProfile,
    powerFlow: "unknown",
    quotas: {},
    ...overrides,
  };
}

describe("device detail summary", () => {
  it("does not claim raw readings are available after a quota failure", () => {
    const markdown = buildDeviceSummaryMarkdown(device({ quotaError: "EcoFlow returned invalid device readings." }));

    expect(markdown).toContain("Live readings could not be loaded");
    expect(markdown).toContain("EcoFlow returned invalid device readings.");
    expect(markdown).not.toContain("Live device data is available");
  });

  it("points to raw readings only when the device returned some", () => {
    const markdown = buildDeviceSummaryMarkdown(device({ quotas: { voltage: 230 } }));

    expect(markdown).toContain("Live device data is available in **View Raw Readings**.");
  });

  it("states when an online device has no readings and no error", () => {
    const markdown = buildDeviceSummaryMarkdown(device());

    expect(markdown).toContain("EcoFlow returned no live readings for this device.");
  });

  it("shows a single reported power direction without an Unknown table cell", () => {
    const markdown = buildDeviceSummaryMarkdown(device({ outputWatts: 25 }));

    expect(markdown).toContain("**Output:** 25 W");
    expect(markdown).not.toContain("| Unknown |");
  });
});
