import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { callCider } from "./functions";

interface Preferences {
  exitOnSuccess: boolean;
}

export default async function Command() {
  const { exitOnSuccess } = getPreferenceValues<Preferences>();
  try {
    await callCider("/playback/add-to-library", "POST");
    await callCider("/playback/set-rating", "POST", { rating: 1 });
    if (exitOnSuccess) await showHUD("⭐️ Added to Favorites");
    else
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Favorites",
      });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't Connect to Cider",
      message: "Make sure Cider is running and try again.",
    });
  }
}
