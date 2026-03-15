import { describe, expect, it } from "vitest";

import { getEffectivePlan, getLiveProjectLimit } from "./license-plan";
import { LicenseState } from "./types";

describe("license plan helpers", () => {
  it("falls back to starter when no license is active", () => {
    expect(getEffectivePlan(null)).toBe("starter");

    const invalidState: LicenseState = {
      customerEmail: "founder@example.com",
      customerName: "Founder",
      instanceId: "inst_123",
      instanceName: "MacBook Pro",
      licenseKey: "lic_key",
      licenseKeyId: "lic_123",
      licenseStatus: "disabled",
      plan: "pro",
      productId: "prod_pro",
      status: "invalid",
      subscriptionStatus: "cancelled",
      updatedAt: new Date().toISOString(),
    };

    expect(getEffectivePlan(invalidState)).toBe("starter");
  });

  it("treats pro as the unlocked project tier", () => {
    expect(getLiveProjectLimit("starter")).toBe(1);
    expect(getLiveProjectLimit("pro")).toBe(Number.POSITIVE_INFINITY);
  });
});
