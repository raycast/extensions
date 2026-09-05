import {
  focusOrOpenCrunchyroll,
  fetchLastEpisodeUrl,
  isCrunchyrollRunning,
  enterFullscreen,
} from "./webapp";
import { showToast, Toast } from "@raycast/api";

export default async function WatchingFullscreenCommand() {
  // If Crunchyroll is already running, just focus + fullscreen
  const running = await isCrunchyrollRunning();
  if (running) {
    await showToast({
      style: Toast.Style.Success,
      title: "Crunchyroll is already open",
      message: "Focusing + fullscreen",
    });
    await focusOrOpenCrunchyroll();
    await enterFullscreen();
    return;
  }

  // Not running — fetch last episode URL and open it
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
      toast.message = "Auto-resuming + fullscreen";
      await focusOrOpenCrunchyroll(url);
      // Wait for video to load before entering fullscreen
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await enterFullscreen();
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

  await focusOrOpenCrunchyroll();
}
