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
      console.log("Syncthing restart triggered successfully.");
      showHUD("✅ Syncthing restart triggered!");
    } else {
      console.error(
        "Failed to trigger Syncthing restart. Status: ",
        res.status,
      );
      showHUD("❌ Failed to trigger Syncthing restart.");
    }
  } catch (error) {
    console.error("Error triggering Syncthing restart: ", error);
    showHUD("❌ Error triggering Syncthing restart.");
  }
}

export default async function Command() {
  // No UI, just restart syncthing
  await restartSyncthing();
}
