import { describe, expect, it } from "vitest";
import { DEVICE_CATEGORIES, DOCUMENTED_API_DEVICE_FAMILIES, getApiSupportLevel } from "../src/devices/catalog";
import { DEVICE_PROFILES, UNKNOWN_DEVICE_PROFILE } from "../src/devices/profiles";
import { buildDeviceSnapshot } from "../src/devices/status";
import type { DeviceCategory } from "../src/types/device";

describe("device catalog", () => {
  it("defines a distinct functional emoji for every device category", () => {
    const expectedCategories: DeviceCategory[] = [
      "power-station",
      "home-battery",
      "solar",
      "whole-home",
      "power-kit",
      "appliance",
      "smart-plug",
      "unknown",
    ];

    expect(DEVICE_CATEGORIES.map((definition) => definition.category)).toEqual(expectedCategories);
    expect(new Set(DEVICE_CATEGORIES.map((definition) => definition.emoji)).size).toBe(DEVICE_CATEGORIES.length);
  });

  it("builds a usable snapshot for every documented API family", () => {
    const profiles = DOCUMENTED_API_DEVICE_FAMILIES.map((family) =>
      DEVICE_PROFILES.find((profile) => profile.family === family),
    );

    expect(profiles.every(Boolean)).toBe(true);
    for (const profile of profiles) {
      if (!profile) continue;
      const prefix = profile.prefixes[0];
      expect(prefix).toBeTruthy();
      const snapshot = buildDeviceSnapshot(
        { sn: `${prefix}CATALOGTEST`, online: 1, deviceName: profile.displayName },
        { cmsBattSoc: 50, powInSumW: 100, powOutSumW: 25 },
      );

      expect(snapshot.profile.family).toBe(profile.family);
      expect(snapshot.name).toBe(profile.displayName);
      expect(snapshot.online).toBe(true);
      expect(snapshot.quotas).not.toEqual({});
      expect(getApiSupportLevel(snapshot.profile)).toBe("documented");
    }
  });

  it("separates documented, legacy, and generic support", () => {
    const legacy = DEVICE_PROFILES.find((profile) => profile.family === "delta-max");
    expect(legacy && getApiSupportLevel(legacy)).toBe("legacy");
    expect(getApiSupportLevel(UNKNOWN_DEVICE_PROFILE)).toBe("generic");
  });
});
