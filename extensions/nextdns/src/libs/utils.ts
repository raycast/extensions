import { Color, Icon } from "@raycast/api";
import { Log } from "../types";

export function getIdHex(id: string) {
  return Buffer.from(id).toString("hex");
}

export function getIconById(id: string) {
  return {
    source: `https://favicons.nextdns.io/hex:${getIdHex(id)}@2x.png`,
    fallback: Icon.Globe,
  };
}

export function getStatusTag(status: string) {
  switch (status) {
    case "blocked":
      return { value: "Blocked", color: Color.Red };
    case "allowed":
      return { value: "Allowed", color: Color.Green };
    default:
      return null;
  }
}

export function getDeviceTag(device: Log["device"] | null) {
  return {
    tag: device ? device.name : "Unknown",
    tooltip: device ? device.model : "No model",
  };
}
