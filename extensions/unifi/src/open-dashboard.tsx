import { open, showHUD } from "@raycast/api";
import { UniFiClient } from "./api/client";
import { getSelectedSite } from "./api/preferences";

export default async function OpenDashboard() {
  const client = UniFiClient.fromPreferences();
  const site = await getSelectedSite();
  await open(client.getDashboardUrl(site));
  await showHUD("Opening UniFi dashboard");
}
