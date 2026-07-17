import { getPreferenceValues, open } from "@raycast/api";

export default async function Admin() {
  const url = getPreferenceValues<Preferences.Admin>().adminConsoleURL;
  await open(url || "https://login.tailscale.com/admin/machines");
}
