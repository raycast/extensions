import { getPreferenceValues, open, showHUD } from "@raycast/api";
import { GetDashboardUrl } from "./lib/unifi/unifi";

export default async function OpenDashboard() {
  const { host } = getPreferenceValues<Preferences>();
  const dash = GetDashboardUrl(host);
  open(dash);
  showHUD("Opening UniFi Dashboard");
}
