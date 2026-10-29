import { describe, expect, it } from "vitest";
import {
  OVERVIEW_RESOURCE_TARGETS,
  focusResourceItems,
  protectProblemContext,
} from "../src/lib/resource-navigation";

describe("overview resource navigation", () => {
  it("opens every overview row at the matching resource group", () => {
    expect(OVERVIEW_RESOURCE_TARGETS.networksAndWifi.map(({ context }) => context.resourceKey)).toEqual([
      "network-networks",
      "network-wifi",
    ]);
    expect(OVERVIEW_RESOURCE_TARGETS.wanAndFirewall.map(({ context }) => context.resourceKey)).toEqual([
      "network-wans",
      "network-firewall-policies",
    ]);
    expect(OVERVIEW_RESOURCE_TARGETS.cameras[0].context.resourceKey).toBe("protect-cameras");
    expect(OVERVIEW_RESOURCE_TARGETS.sensors[0].context.resourceKey).toBe("protect-sensors");
    expect(OVERVIEW_RESOURCE_TARGETS.alarmMode[0].context.resourceKey).toBe("protect-nvr");
  });

  it("passes and applies the exact Protect entity ID", () => {
    const items = [{ id: "camera-1" }, { id: "camera-2" }];

    expect(protectProblemContext("protect-cameras", "camera-2")).toEqual({
      entityId: "camera-2",
      resourceKey: "protect-cameras",
    });
    expect(focusResourceItems(items, "camera-2")).toEqual([{ id: "camera-2" }]);
  });
});
