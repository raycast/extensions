import type OBSWebSocket from "obs-websocket-js";
import { popToRoot, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getObs } from "@/lib/obs";
import { appInstalled, appNotInstallAlertDialog, showWebsocketConnectionErrorToast } from "@/lib/utils";

export default async function main() {
  if (!(await appInstalled())) {
    return appNotInstallAlertDialog();
  }

  let obs: OBSWebSocket;
  try {
    obs = await getObs();
  } catch {
    return showWebsocketConnectionErrorToast();
  }

  const { outputActive } = await obs.call("GetRecordStatus");

  if (!outputActive) {
    await showFailureToast("Recording is not active", {
      title: "Recording Error",
    });
    return popToRoot();
  }

  const { outputPaused } = (await obs.call("ToggleRecordPause")) as unknown as { outputPaused: boolean };

  if (outputPaused) {
    showHUD("Recording pause");
  } else {
    showHUD("Recording resumed");
  }
}
