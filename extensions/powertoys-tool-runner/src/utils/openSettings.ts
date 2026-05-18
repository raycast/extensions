import { runPowerShellScript, showFailureToast } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { isPowerToysRunning } from "./triggerEvent";
import { getPowerToysInstallPath } from "./getPowerToysInstallPath";

export async function openPowerToysSettings(moduleName: string): Promise<void> {
  try {
    const [isRunning, installPath] = await Promise.all([isPowerToysRunning(), getPowerToysInstallPath()]);

    if (!isRunning) {
      await showToast({
        style: Toast.Style.Failure,
        title: "PowerToys is not running",
        message: "Please ensure PowerToys is installed and running",
      });
      return;
    }

    if (!installPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "PowerToys installation not found",
        message: "Could not locate PowerToys install directory",
      });
      return;
    }

    const escapedPath = installPath.replace(/'/g, "''");
    const psCommand = `Start-Process '${escapedPath}\\PowerToys.exe' -ArgumentList '--open-settings=${moduleName}'`;

    await runPowerShellScript(psCommand, {
      timeout: 5000,
    });
  } catch (error) {
    await showFailureToast(error, {
      title: `Failed to open ${moduleName} settings`,
    });
  }
}
