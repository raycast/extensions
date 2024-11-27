import { PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { ConnectionStatus, disconnectFromWarp, getWarpStatus } from "./lib";

export default async () => {
  try {
    const statusResult = await getWarpStatus();
    if (statusResult.status === ConnectionStatus.Disconnected) {
      await showHUD("Not connected", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
      return;
    }
    const disconnectionResult = await disconnectFromWarp();
    if (disconnectionResult) {
      await showHUD("Disconnected", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
      return;
    }

    throw new Error("Failed to disconnect");
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to disconnect",
    });
  }
};
