import { runPowerShellScript, showFailureToast } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { ensurePowerToysIsRunning } from "./triggerEvent";
import { getPowerToysInstallPath } from "./getPowerToysInstallPath";

export async function openPowerToysSettings(moduleName: string): Promise<void> {
  try {
    const isRunning = await ensurePowerToysIsRunning();

    if (!isRunning) {
      return;
    }

    const installPath = await getPowerToysInstallPath();

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
