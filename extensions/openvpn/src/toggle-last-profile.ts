import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { connect, disconnect, getStatus, isRunning, startOpenVPN } from "./utils";

export default async function Command() {
  await closeMainWindow();

  const isAppRunning = await isRunning();

  if (!isAppRunning) {
    startOpenVPN();
  }

  const status = await getStatus();

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
