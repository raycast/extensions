import { Action, Tool } from "@raycast/api";
import { UniFiClient } from "../api/client";
import { resolveNetworkSite } from "../api/sites";

type Input = {
  /** Exact adopted Network device ID, obtained from search-unifi, get-network-overview, or network-devices. */
  deviceId: string;
  /** Optional device name shown in the confirmation. */
  deviceName?: string;
  /** Optional Network site ID, name, or internal reference. Omit to use the selected site. */
  site?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  info: [
    { name: "Device", value: input.deviceName || input.deviceId },
    ...(input.site ? [{ name: "Site", value: input.site }] : []),
  ],
  message: "Restart this Network device? Connected clients may briefly lose service.",
  style: Action.Style.Destructive,
});

/** Restart an adopted UniFi Network device. */
export default async function restartNetworkDevice(input: Input) {
  const deviceId = input.deviceId.trim();
  if (!deviceId) throw new Error("A Network device ID is required.");
  const client = UniFiClient.fromPreferences();
  const site = await resolveNetworkSite(client, input.site);
  await client.restartNetworkDevice(site.id, deviceId);
  return { deviceId, siteId: site.id, status: "restart-requested" };
}
