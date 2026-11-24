import { environment, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { notifyFailure } from "./lib/command-ui";
import { runAutoWallpaper } from "./lib/wallpaper";

export default async function AutoUpdateWallpaper() {
  const manual = environment.launchType === LaunchType.UserInitiated;
  const toast = manual ? await showToast({ style: Toast.Style.Animated, title: "Updating wallpaper…" }) : undefined;
  try {
    const result = await runAutoWallpaper(manual);
    if (result.kind === "success") {
      await updateCommandMetadata({ subtitle: `SkyFrom · ${result.city}` });
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = result.primaryOnly ? "Wallpaper updated on the primary display" : "Sky wallpaper updated";
      }
    } else if (result.kind === "limited") {
      await updateCommandMetadata({ subtitle: "SkyFrom · Rate limited" });
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "SkyFrom is limiting requests";
        toast.message = result.message;
      }
    } else if (result.kind === "failure") {
      await updateCommandMetadata({
        subtitle: result.paused ? "SkyFrom · Paused after failed updates" : "SkyFrom · Update failed",
      });
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn’t update wallpaper";
        toast.message = result.message;
      } else if (result.paused) {
        await notifyFailure(
          "Automatic wallpaper updates paused",
          new Error(`${result.message} Run Auto Update Wallpaper to retry.`),
        );
      }
    } else if (result.kind === "busy" && toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "A wallpaper update is already running";
    } else if (result.kind === "disabled") {
      await updateCommandMetadata({ subtitle: "SkyFrom · Automatic updates off" });
    } else if (result.kind === "paused") {
      await updateCommandMetadata({ subtitle: "SkyFrom · Automatic updates paused" });
    }
  } catch (error) {
    if (toast) await toast.hide();
    if (manual) await notifyFailure("Couldn’t update wallpaper", error);
    else throw error;
  }
}
