import { showToast, Toast, showHUD, open, launchCommand, LaunchType } from "@raycast/api";
import { stopTimer } from "./services/harvest";

export default async function main() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Loading..." });
  await toast.show();
  await stopTimer().catch(async (error) => {
    console.error(error.response.data);
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "API Error",
      message: "Could not stop your timer",
    });
    return;
  });
  await toast.hide();
  await showHUD("Timer stopped");
}
