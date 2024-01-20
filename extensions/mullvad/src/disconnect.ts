import { exec } from "child_process";
import { PopToRootType, showHUD } from "@raycast/api";
import { promisify } from "node:util";
import { verifyIsMullvadInstalled } from "./utils";

const execAsync = promisify(exec);

export default async function Command() {
  const isMullvadInstalled = await verifyIsMullvadInstalled();
  if (!isMullvadInstalled) return;

  const priorStatus = (await execAsync("mullvad status")).stdout;
  await execAsync("mullvad disconnect");

  const message = priorStatus.trim() === "Disconnected" ? "Already Disconnected" : `Disconnected. Was ${priorStatus}`;
  await showHUD(message, {
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}
