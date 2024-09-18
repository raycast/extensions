import { PopToRootType, showHUD } from "@raycast/api";
import { execSync } from "node:child_process";
import { verifyIsMullvadInstalled } from "./utils";

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function Command() {
  const isMullvadInstalled = await verifyIsMullvadInstalled();
  if (!isMullvadInstalled) return;

  const priorStatus = execSync("mullvad status").toString();
  execSync("mullvad connect");
  await pause(500); // Fetching the new status too early may return "Disconnected"
  const newStatus = execSync("mullvad status").toString();

  // `mullvad connect` doesn't change the relay,
  // so if the status is anything except 'Disconnected' we can assume that nothing has changed.
  const message = priorStatus.trim() === "Disconnected" ? newStatus : "Already Connected";

  await showHUD(message, {
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}
