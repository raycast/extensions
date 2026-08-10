import { PopToRootType, showHUD } from "@raycast/api";
import { execSync } from "node:child_process";
import { verifyIsMullvadInstalled } from "./utils";

export default async function Command() {
  const isMullvadInstalled = await verifyIsMullvadInstalled();
  if (!isMullvadInstalled) return;

  const priorStatus = execSync("mullvad status").toString().split("\n")[0];
  execSync("mullvad connect");

  // `mullvad connect` doesn't change the relay,
  // so if the status is anything except 'Disconnected' we can assume that nothing has changed.
  const message = priorStatus === "Disconnected" ? "Connected" : "Already Connected";

  await showHUD(message, {
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}
