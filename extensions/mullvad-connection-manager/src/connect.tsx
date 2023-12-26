import { exec } from "child_process";
import { closeMainWindow, PopToRootType, showToast, Toast } from "@raycast/api";
import { verifyIsMullvadInstalled } from "./utils";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export default async function Command() {
  const isMullvadInstalled = await verifyIsMullvadInstalled();
  if (!isMullvadInstalled) return;

  await execAsync("mullvad connect");
  await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

  await showToast({
    style: Toast.Style.Success,
    title: "Connected",
  });
}
