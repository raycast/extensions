import { Toast, closeMainWindow, showToast } from "@raycast/api";
import { ConnectionStatus, connectToWarp, getWarpStatus } from "./lib";

export default async () => {
  try {
    const statusResult = await getWarpStatus();
    if (statusResult.status === ConnectionStatus.Connected) {
      await showToast({
        style: Toast.Style.Success,
        title: "Already connected",
      });
      await closeMainWindow();
      return;
    }
    const connectionResult = await connectToWarp();
    if (connectionResult) {
      await showToast({
        style: Toast.Style.Success,
        title: "Connected",
      });
      await closeMainWindow();
      return;
    }

    throw new Error("Failed to connect");
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to connect",
    });
    await closeMainWindow();
  }
};
