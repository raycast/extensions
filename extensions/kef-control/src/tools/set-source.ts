import { getPreferenceValues } from "@raycast/api";

export type Source = "wifi" | "bluetooth" | "tv" | "optical" | "usb" | "aux" | "standby";

/**
 * Set the source of the KEF LSX2, LSX 2LT
 */
export default async function setSource(source: Source) {
  const preferences = getPreferenceValues<Preferences>();
  await fetch(
    `http://${preferences["ip-address"]}/api/setData?path=settings:/kef/play/physicalSource&roles=value&value={"type":"kefPhysicalSource","kefPhysicalSource":"${source}"}`,
  );
}
