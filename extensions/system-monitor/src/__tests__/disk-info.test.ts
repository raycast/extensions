import { describe, expect, it } from "vitest";

import { physicalStoreDevice } from "../lib/disk-info";

describe("physicalStoreDevice", () => {
  it("derives the physical disk from APFS store identifiers", () => {
    expect(physicalStoreDevice("disk3s1")).toBe("disk3");
    expect(physicalStoreDevice("disk0s2")).toBe("disk0");
  });

  it("returns null when parsing fails", () => {
    expect(physicalStoreDevice("Unknown")).toBeNull();
  });
});
