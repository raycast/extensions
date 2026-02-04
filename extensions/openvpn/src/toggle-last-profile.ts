import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { connect, disconnect, getStatus, isRunning, startOpenVPN } from "./utils";

export default async function Command() {
  await closeMainWindow();

  const isAppRunning = await isRunning();

  if (!isAppRunning) {
    const isReady = await startOpenVPN();
    if (!isReady) {
      await showToast({
        style: Toast.Style.Failure,
        title: "OpenVPN Connect isn't ready. Open the app and allow Accessibility permissions.",
      });
      return;
    }
  }

  const status = await getStatus();

  if (!status.selectedProfileName) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No active profile found. Open OpenVPN Connect and ensure a profile is visible.",
    });
    return;
  }

  let error;

  if (status.isConnected) {
    error = await disconnect();
  } else {
    error = await connect(status.selectedProfileName);
  }

  if (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: error,
    });

    return;
  }

  await showToast({
    style: status.isConnected ? Toast.Style.Failure : Toast.Style.Success,
    title: `${status.selectedProfileName} ${status.isConnected ? "DISCONNECTED" : "CONNECTED"}`,
  });
}
