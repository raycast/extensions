import { getPreferenceValues, open } from "@raycast/api";
import { getDashboardBaseUrl } from "./dashboard-url";

export default async function OpenDashboardCommand() {
  const preferences = getPreferenceValues<Preferences>();
  await open(getDashboardBaseUrl(preferences.apiUrl));
}
