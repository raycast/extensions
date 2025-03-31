import { Toast, showToast } from "@raycast/api";
import { getProfileNames, startFocusWithProfile, startFocus, getActiveProfileName } from "./utils";
import { ensureFocusIsRunning } from "./helpers";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting Focus...",
  });

  if (!(await ensureFocusIsRunning())) {
    return;
  }

  const activeProfile = await getActiveProfileName();
  if (activeProfile) {
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Focus session already running",
      message: `Profile "${activeProfile}" is currently active`,
    });
    return;
  }

  const profiles = await getProfileNames();

  // Start with the first profile when multiple profiles exist
  const firstProfile = profiles[0];

  if (profiles.length === 0) {
    await startFocus();
    await toast.hide();
    await showToast({ style: Toast.Style.Success, title: "Focus started" });
  } else {
    toast.title = `Starting Focus with profile: ${firstProfile}...`;
    await startFocusWithProfile(firstProfile);
    await toast.hide();
    await showToast({ style: Toast.Style.Success, title: `Focus started with profile: ${firstProfile}` });
  }
}
