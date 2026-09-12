import { PopToRootType, showHUD } from "@raycast/api";
import { execSync } from "node:child_process";
import { verifyIsMullvadInstalled } from "./utils";

export default async function Command() {
  const isMullvadInstalled = await verifyIsMullvadInstalled();
  if (!isMullvadInstalled) return;

  const priorStatus = execSync("mullvad status").toString().split("\n")[0];
  // `mullvad reconnect` doesn't do anything if disconnected.
  let message;
  if (priorStatus === "Connected") {
    execSync("mullvad reconnect");
    message = "Reconnected";
  } else {
    message = "Not Connected";
  }

  await showHUD(message, {
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}
