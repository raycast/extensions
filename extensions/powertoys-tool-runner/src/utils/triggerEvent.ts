import { runPowerShellScript, showFailureToast } from "@raycast/utils";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getPowerToysInstallPath } from "./getPowerToysInstallPath";

export async function isPowerToysRunning(): Promise<boolean> {
  try {
    const psCommand = `(Get-Process -Name 'PowerToys' -ErrorAction SilentlyContinue) -ne $null`;
    const result = await runPowerShellScript(psCommand, {
      timeout: 3000,
    });
    return result.trim() === "True";
  } catch (error) {
    console.error("Failed to check PowerToys status:", error);
    return false;
  }
}

export async function ensurePowerToysIsRunning(): Promise<boolean> {
  const isRunning = await isPowerToysRunning();
  if (isRunning) return true;

  const preferences = getPreferenceValues<Preferences>();
  if (!preferences.autoStartPowerToys) {
    await showToast({
      style: Toast.Style.Failure,
      title: "PowerToys is not running",
      message: "Please ensure PowerToys is installed and running",
    });
    return false;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Starting PowerToys...",
  });

  const installPath = await getPowerToysInstallPath();
  if (!installPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to auto-start PowerToys",
      message: "Could not locate PowerToys install directory.",
    });
    return false;
  }

  try {
    const escapedPath = installPath.replace(/'/g, "''");
    const psCommand = `Start-Process '${escapedPath}\\PowerToys.exe'`;
    await runPowerShellScript(psCommand, { timeout: 5000 });

    let attempts = 0;
    while (attempts < 10) {
      await new Promise((r) => setTimeout(r, 2000));
      if (await isPowerToysRunning()) {
        return true;
      }
      attempts++;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to auto-start PowerToys",
      message: "PowerToys did not start in time. Please ensure PowerToys is installed.",
    });
    return false;
  } catch (error) {
    console.error("Failed to auto-start PowerToys:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to auto-start PowerToys",
      message: "Please ensure PowerToys is installed.",
    });
    return false;
  }
}

export async function triggerPowerToysEvent(eventName: string, toolName: string): Promise<void> {
  try {
    const isRunning = await ensurePowerToysIsRunning();

    if (!isRunning) {
      return;
    }

    const psCommand = `[System.Threading.EventWaitHandle]::OpenExisting('${eventName}').Set()`;

    console.log(`Triggering ${toolName}...`);

    let attempts = 0;
    let success = false;
    let lastError: unknown = null;

    while (attempts < 15) {
      try {
        await runPowerShellScript(psCommand, {
          timeout: 5000,
        });
        success = true;
        break;
      } catch (error) {
        lastError = error;
        attempts++;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!success) {
      throw lastError;
    }

    console.log(`${toolName} triggered successfully`);
  } catch (error) {
    console.error(`${toolName} launch failed:`, error);
    await showFailureToast(error, {
      title: `Failed to launch ${toolName}`,
    });
  }
}
