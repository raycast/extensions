import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getProfiles } from "./profiles";
import { openProfileWindow } from "./launch-profile";

export async function openProfileAtIndex(index: number): Promise<void> {
  try {
    const profiles = await getProfiles();
    const profile = profiles[index];
    if (!profile) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Profile ${index + 1} doesn't exist`,
        message: "Create or re-add a profile in Manage Profiles first.",
      });
      return;
    }
    await openProfileWindow(profile);
  } catch (error) {
    await showFailureToast(error, {
      title: "Couldn't load profiles",
    });
  }
}
