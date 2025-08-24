import fetch from "cross-fetch";
import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";

interface Preferences {
  exitOnSuccess: boolean;
}

export default async function Command() {
  const { exitOnSuccess } = getPreferenceValues<Preferences>();
  try {
    await fetch("http://localhost:10767/api/v1/playback/add-to-library", {
      method: "POST",
    });
    await fetch("http://localhost:10767/api/v1/playback/set-rating", {
      method: "POST",
      body: JSON.stringify({ rating: 1 }),
      headers: { "Content-Type": "application/json" },
    });
    if (exitOnSuccess) await showHUD("⭐️ Added to Favourites");
    else
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Favourites",
      });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't Connect to Cider",
      message: "Make sure Cider is running and try again.",
    });
  }
}
