import { exec } from "child_process";
import { PopToRootType, showHUD } from "@raycast/api";
import { verifyIsMullvadInstalled } from "./utils";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export default async function Command() {
  const isMullvadInstalled = await verifyIsMullvadInstalled();
  if (!isMullvadInstalled) return;

  await execAsync("mullvad connect");
  await showHUD("Connected", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
}
