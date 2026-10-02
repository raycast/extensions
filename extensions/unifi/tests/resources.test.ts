import { describe, expect, it } from "vitest";
import { getResourceDefinition, RESOURCE_DEFINITIONS } from "../src/api/resources";

describe("resource catalog", () => {
  it("uses unique stable keys", () => {
    const keys = RESOURCE_DEFINITIONS.map((resource) => resource.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("encodes required context values", () => {
    expect(getResourceDefinition("network-firewall-policies").path({ siteId: "site/id" })).toBe(
      "/v1/sites/site%2Fid/firewall/policies",
    );
    expect(
      getResourceDefinition("mobility-device-clients").path({ workspaceId: "workspace/id", deviceId: "device/id" }),
    ).toBe("/v1/mobility/workspaces/workspace%2Fid/devices/device%2Fid/clients");
  });

  it("fails closed for unsupported resources and missing context", () => {
    expect(() => getResourceDefinition("anything")).toThrow("Unsupported UniFi resource");
    expect(() => getResourceDefinition("network-devices").path({})).toThrow("site ID");
  });
});
