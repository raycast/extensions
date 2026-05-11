import { Color, List } from "@raycast/api";
import Process from "../models/Process";

export type ItemAccessory = Exclude<React.ComponentProps<typeof List.Item>["accessories"], null | undefined>[number];

export function getProcessAccessories(p: Process) {
  const accessories: ItemAccessory[] = [];

  for (const portInfo of p.portInfo ?? []) {
    if (portInfo.name !== undefined) {
      accessories.push({
        tooltip: `${portInfo.host}:${portInfo.port} (${portInfo.name})`,
        tag: {
          value: `${portInfo.port} (${portInfo.name})`,
          color: Color.Green,
        },
      });
    } else {
      accessories.push({
        tooltip: `${portInfo.host}:${portInfo.port}`,
        tag: {
          value: `${portInfo.port}`,
        },
      });
    }
  }

  return accessories;
}
