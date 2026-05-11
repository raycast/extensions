import { PopToRootType, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { verifyIsMullvadInstalled } from "./utils";

export default async function Command() {
  const isMullvadInstalled = await verifyIsMullvadInstalled();
  if (!isMullvadInstalled) return;

  const priorStatus = execSync("mullvad status").toString().split("\n")[0];
  execSync("mullvad disconnect");

  const message = priorStatus === "Disconnected" ? "Already Disconnected" : "Disconnected";

  await showHUD(message, {
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}
