import { Color } from "@raycast/api";

/** How reachable a listening socket is from outside this machine, judged by its bind address. */
export type Exposure = "loopback" | "all-interfaces" | "specific";

export function classifyExposure(host: string): Exposure {
  const address = host.replace(/^\[|\]$/g, "");
  if (address === "*" || address === "0.0.0.0" || address === "::" || address === "") return "all-interfaces";
  if (address === "localhost" || address === "::1" || address.startsWith("127.")) return "loopback";
  return "specific";
}

const EXPOSURE_COLOR: Record<Exposure, Color> = {
  loopback: Color.Green,
  "all-interfaces": Color.Orange,
  specific: Color.Blue,
};

const EXPOSURE_DESCRIPTION: Record<Exposure, string> = {
  loopback: "Reachable only from this machine",
  "all-interfaces": "Reachable from the network",
  specific: "Bound to one specific interface",
};

export function exposureColor(exposure: Exposure) {
  return EXPOSURE_COLOR[exposure];
}

export function exposureDescription(exposure: Exposure) {
  return EXPOSURE_DESCRIPTION[exposure];
}
