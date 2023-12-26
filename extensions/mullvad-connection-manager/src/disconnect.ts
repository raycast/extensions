import { exec } from "child_process";
import { closeMainWindow, PopToRootType, showToast, Toast } from "@raycast/api";
import Style = Toast.Style;
import { promisify } from "node:util";
import { verifyIsMullvadInstalled } from "./utils";

const execAsync = promisify(exec);

export default async function Command() {
  const isMullvadInstalled = await verifyIsMullvadInstalled();
  if (!isMullvadInstalled) return;

  await execAsync("mullvad disconnect");
  await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

  await showToast({ style: Style.Success, title: "Disconnected" });
}
