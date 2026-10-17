import type { ResourceKey } from "../api/resources";
import type { JsonObject } from "../api/types";

export interface ResourceLaunchContext {
  entityId?: string;
  resourceKey: ResourceKey;
}

export interface ResourceCommandTarget {
  context: ResourceLaunchContext;
  name: "browse-network" | "browse-protect";
  title: string;
}

const target = (
  name: ResourceCommandTarget["name"],
  resourceKey: ResourceKey,
  title: string,
): ResourceCommandTarget => ({ context: { resourceKey }, name, title });

export const OVERVIEW_RESOURCE_TARGETS = {
  alarmMode: [target("browse-protect", "protect-nvr", "Open Protect Alarm Mode")],
  cameras: [target("browse-protect", "protect-cameras", "Open Protect Cameras")],
  networksAndWifi: [
    target("browse-network", "network-networks", "Browse Networks"),
    target("browse-network", "network-wifi", "Browse Wi-Fi Broadcasts"),
  ],
  sensors: [target("browse-protect", "protect-sensors", "Open Protect Sensors")],
  wanAndFirewall: [
    target("browse-network", "network-wans", "Browse WAN Interfaces"),
    target("browse-network", "network-firewall-policies", "Browse Firewall Policies"),
  ],
} satisfies Record<string, ResourceCommandTarget[]>;

export function protectProblemContext(resourceKey: string, entityId: string): ResourceLaunchContext {
  return { entityId, resourceKey: resourceKey as ResourceKey };
}

export function focusResourceItems<T extends JsonObject>(items: T[], entityId?: string): T[] {
  return entityId ? items.filter((item) => String(item.id ?? "") === entityId) : items;
}
