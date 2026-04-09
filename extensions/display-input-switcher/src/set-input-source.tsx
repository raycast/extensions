import { Alert, confirmAlert, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { getFirstExternalDisplay, readInputSource, setInputSource } from "./utils/m1ddc";
import { getSource, setPreviousSource } from "./utils/sources";

export default async function setInputSourceCommand(props: LaunchProps<{ arguments: { input: string } }>) {
  const inputValue = parseInt(props.arguments.input, 10);
  const target = getSource(inputValue);

  const display = await getFirstExternalDisplay();
  if (!display) {
    await showToast({ style: Toast.Style.Failure, title: "No external display found" });
    return;
  }

  try {
    const currentOutput = await readInputSource(display.id);
    if (currentOutput !== null) {
      const currentValue = parseInt(currentOutput.trim(), 10);
      if (!isNaN(currentValue) && currentValue > 0) {
        if (currentValue === inputValue) {
          await showToast({ style: Toast.Style.Success, title: `Already on "${target.name}"` });
          return;
        }
        await setPreviousSource(currentValue);
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

    const result = await setInputSource(display.id, inputValue);
    if (result === null) return;

    await showHUD(`Switched to "${target.name}" on "${display.name}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({ style: Toast.Style.Failure, title: "Failed to switch input", message });
  }
}
