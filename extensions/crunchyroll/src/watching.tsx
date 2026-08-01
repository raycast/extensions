import {
  openCrunchyroll,
  openCrunchyrollURL,
  fetchLastEpisodeUrl,
} from "./webapp";
import { showToast, Toast } from "@raycast/api";

export default async function WatchingCommand() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Finding your last episode...",
    message: "Reading Crunchyroll history",
  });

  try {
    const url = await fetchLastEpisodeUrl();
    if (url) {
      toast.style = Toast.Style.Success;
      toast.title = "Opening last watched episode";
      toast.message = "Auto-resuming in web app";
      await openCrunchyrollURL(url);
      return;
    }
    toast.style = Toast.Style.Failure;
    toast.title = "No history found";
    toast.message = "Watch something on Crunchyroll first";
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't fetch history";
    toast.message =
      "Enable 'Allow JavaScript from Apple Events' in Safari Settings";
  }

  await openCrunchyroll();
}
