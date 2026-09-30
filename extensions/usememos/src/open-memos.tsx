import { getPreferenceValues, open } from "@raycast/api";

export default async function openMemos() {
  const { memosServerUrl } = getPreferenceValues<Preferences.OpenMemos>();
  await open(memosServerUrl);
}
