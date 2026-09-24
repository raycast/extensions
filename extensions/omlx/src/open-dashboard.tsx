import { open, getPreferenceValues } from "@raycast/api";

interface Preferences {
  serverUrl: string;
}

export default async function OpenDashboard() {
  const { serverUrl } = getPreferenceValues<Preferences>();
  const base = serverUrl.replace(/\/v1\/?$/, "");
  await open(`${base}/admin`);
}
