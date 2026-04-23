import { Alert, confirmAlert, showHUD, showToast, Toast } from "@raycast/api";
import { getFirstExternalDisplay, readInputSource, switchInputSource } from "./utils/m1ddc";
import { getPreviousSource, getSourceName, setPreviousSource } from "./utils/sources";

export default async function toggleInputSource() {
  const display = await getFirstExternalDisplay();
  if (!display) {
    await showToast({ style: Toast.Style.Failure, title: "No external display found" });
    return;
  }

  try {
    const previousValue = await getPreviousSource();
    if (previousValue === null) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No previous input source",
        message: 'Use "Switch Input Source" first to establish a history',
      });
      return;
    }

    // Read current input so we can store it as the new previous
    const currentOutput = await readInputSource(display.id);
    let currentValue: number | null = null;
    if (currentOutput !== null) {
      const parsed = parseInt(currentOutput.trim(), 10);
      if (!isNaN(parsed) && parsed > 0) {
        currentValue = parsed;
      }
    }

    if (currentValue === previousValue) {
      await showToast({ style: Toast.Style.Success, title: `Already on "${getSourceName(previousValue)}"` });
      return;
    }

    const targetName = getSourceName(previousValue);
    const confirmed = await confirmAlert({
      title: "Toggle Input Source",
      message: `Switch "${display.name}" to ${targetName}?`,
      primaryAction: { title: "Switch" },
      dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      rememberUserChoice: true,
    });
    if (!confirmed) return;

    const result = await switchInputSource(display.id, previousValue);
    if (result === null) return;

    // Current becomes the new previous
    if (currentValue !== null) {
      await setPreviousSource(currentValue);
    }

    await showHUD(`Switched to "${targetName}" on "${display.name}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({ style: Toast.Style.Failure, title: "Failed to switch input", message });
  }
}
