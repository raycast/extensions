import { Alert, confirmAlert, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { getFirstExternalDisplay, readInputSource, switchInputSource } from "./utils/m1ddc";
import { getSource, setPreviousSource } from "./utils/sources";

export default async function switchInputSourceCommand(props: LaunchProps<{ arguments: { input: string } }>) {
  const inputValue = parseInt(props.arguments.input, 10);
  const target = getSource(inputValue);

  const display = await getFirstExternalDisplay();
  if (!display) {
    await showToast({ style: Toast.Style.Failure, title: "No external display found" });
    return;
  }

  try {
    const currentOutput = await readInputSource(display.id);
    let currentValue: number | null = null;
    if (currentOutput !== null) {
      const parsed = parseInt(currentOutput.trim(), 10);
      if (!isNaN(parsed) && parsed > 0) {
        if (parsed === inputValue) {
          await showToast({ style: Toast.Style.Success, title: `Already on "${target.name}"` });
          return;
        }
        currentValue = parsed;
      }
    }

    const confirmed = await confirmAlert({
      title: "Switch Input Source",
      message: `Switch "${display.name}" to ${target.name}?`,
      primaryAction: { title: "Switch" },
      dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      rememberUserChoice: true,
    });
    if (!confirmed) return;

    if (currentValue !== null) {
      await setPreviousSource(currentValue);
    }

    const result = await switchInputSource(display.id, inputValue);
    if (result === null) return;

    await showHUD(`Switched to "${target.name}" on "${display.name}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({ style: Toast.Style.Failure, title: "Failed to switch input", message });
  }
}
