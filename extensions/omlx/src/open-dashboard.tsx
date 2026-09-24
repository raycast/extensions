import { open, getPreferenceValues } from "@raycast/api";

export default async function OpenDashboard() {
  const { serverUrl } = getPreferenceValues<Preferences.OpenDashboard>();
  const base = serverUrl.replace(/\/v1\/?$/, "");
  await open(`${base}/admin`);
}
