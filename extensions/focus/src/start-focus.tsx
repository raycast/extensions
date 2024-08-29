import { Toast, showToast } from "@raycast/api";
import { getInstallStatus, getProfileNames, startFocusWithProfile, startFocus } from "./utils";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting Focus...",
  });

  if (!(await getInstallStatus())) {
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Focus is not installed",
      message: "Install Focus app from: https://heyfocus.com",
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
