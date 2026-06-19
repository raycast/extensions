import { PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { getWarpStatus, toggleWarpConnection } from "./lib";
import { ConnectionStatus } from "./types";

const capitalize = (str: string) => `${str.charAt(0).toUpperCase()}${str.slice(1).toLowerCase()}`;

export default async () => {
  try {
    const { status } = await getWarpStatus();

    const connectionCommand = status === ConnectionStatus.Disconnected ? "connect" : "disconnect";

    const connectionResult = await toggleWarpConnection(connectionCommand);

    if (connectionResult) {
      await showHUD(`${capitalize(connectionCommand)}ed`, {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });

      return;
    }

    throw new Error(`Failed to ${connectionCommand}`);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to toggle connection",
    });
  }
};
