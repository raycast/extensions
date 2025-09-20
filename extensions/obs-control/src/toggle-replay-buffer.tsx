import type OBSWebSocket from "obs-websocket-js";
import { showHUD } from "@raycast/api";
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

  const { outputActive } = await obs.call("ToggleReplayBuffer");

  if (outputActive) {
    showHUD("Replay buffer started");
  } else {
    showHUD("Replay buffer stopped");
  }
}
