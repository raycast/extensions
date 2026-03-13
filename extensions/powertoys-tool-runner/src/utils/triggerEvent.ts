import { runPowerShellScript, showFailureToast } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";

async function isPowerToysRunning(): Promise<boolean> {
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

export async function triggerPowerToysEvent(eventName: string, toolName: string): Promise<void> {
  try {
    const isRunning = await isPowerToysRunning();

    if (!isRunning) {
      await showToast({
        style: Toast.Style.Failure,
        title: "PowerToys is not running",
        message: "Please ensure PowerToys is installed and running",
      });
      return;
    }

    const psCommand = `[System.Threading.EventWaitHandle]::OpenExisting('${eventName}').Set()`;

    console.log(`Triggering ${toolName}...`);

    await runPowerShellScript(psCommand, {
      timeout: 5000,
    });

    console.log(`${toolName} triggered successfully`);
  } catch (error) {
    console.error(`${toolName} launch failed:`, error);
    await showFailureToast(error, {
      title: `Failed to launch ${toolName}`,
    });
  }
}
