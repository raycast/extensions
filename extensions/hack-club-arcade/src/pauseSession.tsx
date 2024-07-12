import { getPreferenceValues, showHUD } from "@raycast/api";
import fetch from "node-fetch";

export default async function pauseSession() {
  try {
    const response = await fetch(`https://hackhour.hackclub.com/api/pause/${getPreferenceValues().userid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getPreferenceValues().apiToken}`,
      },
    });

    if (response.ok) {
      showHUD("Session paused successfully!");
    } else {
      showHUD("Failed to pause session");
    }
  } catch (error) {
    console.error("An error occurred", error);
  }
}
