import { LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { RingApi } from "./api/ring-api";
import { getDefaultIntercomId } from "./utils/storage";
import { chooseIntercom, showRingFailure, unlockIntercom } from "./utils/intercoms";

export default async function Command() {
  await showToast({ style: Toast.Style.Animated, title: "Unlocking" });

  try {
    const api = await RingApi.fromStorage();
    const [intercoms, defaultId] = await Promise.all([api.getIntercoms(), getDefaultIntercomId()]);
    const choice = chooseIntercom(intercoms, defaultId);

    if ("intercom" in choice) {
      await unlockIntercom(api, choice.intercom);
      return;
    }

    if (choice.reason === "none") {
      throw new Error("No Ring Intercom found on your Ring account");
    }

    // Let the user choose which door to open, rather than guessing.
    await launchCommand({
      name: "select-intercom",
      type: LaunchType.UserInitiated,
      context: { reason: choice.reason },
    });
  } catch (error) {
    await showRingFailure(error, "Failed to Unlock");
  }
}
