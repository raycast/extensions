import { describe, expect, it } from "vitest";
import { DOCUMENTED_API_DEVICE_FAMILIES } from "../src/devices/catalog";
import { DEVICE_PROFILES, detectDeviceProfile } from "../src/devices/profiles";

describe("device profile detection", () => {
  const cases = DEVICE_PROFILES.flatMap((profile) =>
    profile.prefixes.map((prefix) => [prefix, profile.family] as const),
  );

  it.each(cases)("maps catalog prefix %s to %s", (prefix, family) => {
    expect(detectDeviceProfile({ sn: `${prefix}TEST1234` }).family).toBe(family);
  });

  it("covers every family in EcoFlow's current public API catalog", () => {
    const documentedProfiles = DEVICE_PROFILES.filter((profile) => profile.documentationUrl).map(
      (profile) => profile.family,
    );

    expect(documentedProfiles).toEqual(DOCUMENTED_API_DEVICE_FAMILIES);
    expect(documentedProfiles).toHaveLength(17);
  });

  it("keeps serial prefixes unique across device families", () => {
    const prefixes = DEVICE_PROFILES.flatMap((profile) => profile.prefixes);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("uses the longest descriptive match before generic family names", () => {
    expect(detectDeviceProfile({ sn: "UNKNOWN", productName: "EcoFlow DELTA 3 Max Plus" }).family).toBe(
      "delta-3-max-plus",
    );
  });

  it("keeps unknown devices readable", () => {
    expect(detectDeviceProfile({ sn: "NEWDEVICE123" }).family).toBe("unknown");
  });
});
