import { LaunchProps } from "@raycast/api";
import { applyAndNotify } from "./components/selection-actions";
import { notifyFailure } from "./lib/command-ui";
import { requireSelection } from "./lib/locations";

export default async function SetSkyWallpaper({
  arguments: { city },
}: LaunchProps<{ arguments: Arguments.SetWallpaper }>) {
  try {
    const sky = await requireSelection(city);
    await applyAndNotify(sky);
  } catch (error) {
    await notifyFailure("Couldn’t set wallpaper", error);
  }
}
