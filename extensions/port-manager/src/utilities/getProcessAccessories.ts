import { List } from "@raycast/api";
import Process from "../models/Process";
import { classifyExposure, exposureColor, exposureDescription } from "./exposure";

export type ItemAccessory = Exclude<React.ComponentProps<typeof List.Item>["accessories"], null | undefined>[number];

/**
 * One tag per port. The colour answers "can anyone else reach this?": green for loopback only,
 * orange for a wildcard bind that is open to the network, blue for one specific interface. A
 * named port keeps its name in the label.
 */
export function getProcessAccessories(p: Process) {
  const accessories: ItemAccessory[] = [];

  for (const portInfo of p.portInfo ?? []) {
    const exposure = classifyExposure(portInfo.host);
    const label = portInfo.name !== undefined ? `${portInfo.port} (${portInfo.name})` : `${portInfo.port}`;

    accessories.push({
      tooltip: `${portInfo.host}:${portInfo.port} — ${exposureDescription(exposure)}`,
      tag: { value: label, color: exposureColor(exposure) },
    });
  }

  return accessories;
}
