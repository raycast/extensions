import { PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { ConnectionStatus, connectToWarp, getWarpStatus } from "./lib";

export default async () => {
  try {
    const statusResult = await getWarpStatus();
    if (statusResult.status === ConnectionStatus.Connected) {
      await showHUD("Already connected", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
      return;
    }
    const connectionResult = await connectToWarp();
    if (connectionResult) {
      await showHUD("Connected", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
      return;
    }

    throw new Error("Failed to connect");
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to connect",
    });
  }
};
