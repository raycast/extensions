import { getPreferenceValues, showHUD } from "@raycast/api";

async function restartSyncthing(): Promise<void> {
  const API_KEY = getPreferenceValues().api_key;
  const BASE_URL = getPreferenceValues().base_url;
  try {
    const res = await fetch(BASE_URL + "/system/restart", {
      method: "POST",
      headers: {
        "X-API-Key": API_KEY,
        Accept: "application/json",
      },
    });
    if (res.ok) {
      showHUD("✅ Syncthing restart triggered!");
    } else {
      showHUD("❌ Failed to trigger Syncthing restart.");
    }
  } catch {
    showHUD("❌ Error triggering Syncthing restart.");
  }
}

export default async function Command() {
  await restartSyncthing();
}
