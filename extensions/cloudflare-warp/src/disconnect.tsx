import { Toast, closeMainWindow, showToast } from "@raycast/api";
import { ConnectionStatus, disconnectFromWarp, getWarpStatus } from "./lib";

export default async () => {
  try {
    const statusResult = await getWarpStatus();
    if (statusResult.status === ConnectionStatus.Disconnected) {
      await closeMainWindow();
      await showToast({
        style: Toast.Style.Success,
        title: "Not connected",
      });
      return;
    }
    const disconnectionResult = await disconnectFromWarp();
    if (disconnectionResult) {
      await showToast({
        style: Toast.Style.Success,
        title: "Disconnected",
      });
      await closeMainWindow();
      return;
    }

    throw new Error("Failed to disconnect");
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to disconnect",
    });
    await closeMainWindow();
  }
};
