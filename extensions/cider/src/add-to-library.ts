import fetch from "cross-fetch";
import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";

interface Preferences {
  exitOnSuccess: boolean;
}

export default async function Command() {
  const { exitOnSuccess } = getPreferenceValues<Preferences>();
  try {
    await fetch("http://localhost:10769/addToLibrary");
    if (exitOnSuccess) await showHUD("➕ Added to Library");
    else
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Library",
      });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't Connect to Cider",
      message: "Make sure Cider is running and try again.",
    });
  }
}
