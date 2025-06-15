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

  const { studioModeEnabled } = await obs.call("GetStudioModeEnabled");

  await obs.call("SetStudioModeEnabled", { studioModeEnabled: !studioModeEnabled });

  if (studioModeEnabled) {
    showHUD("Studio Mode disabled");
  } else {
    showHUD("Studio Mode enabled");
  }
}
