import { exec } from "child_process";
import { PopToRootType, showHUD } from "@raycast/api";
import { verifyIsMullvadInstalled } from "./utils";
import { promisify } from "node:util";

const execAsync = promisify(exec);

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function Command() {
  const isMullvadInstalled = await verifyIsMullvadInstalled();
  if (!isMullvadInstalled) return;

  const priorStatus = (await execAsync("mullvad status")).stdout;
  await execAsync("mullvad connect");
  await pause(500); // Fetching the new status too early may return "Disconnected"
  const newStatus = (await execAsync("mullvad status")).stdout;

  // `mullvad connect` doesn't change the relay,
  // so if the status is anything except 'Disconnected' we can assume that nothing has changed.
  const message = priorStatus.trim() === "Disconnected" ? newStatus : "Already Connected";

  await showHUD(message, {
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}
