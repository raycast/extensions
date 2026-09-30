import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { getFirstExternalDisplay, readInputSource, switchInputSource } from "./utils/m1ddc";
import { getSource, getSourceName, setPreviousSource } from "./utils/sources";

export default async function previewInputSource(
  props: LaunchProps<{ arguments: { input: string; seconds: string } }>,
) {
  const rawSeconds = props.arguments.seconds;
  const parsed = rawSeconds ? parseInt(rawSeconds, 10) : 10;
  if (rawSeconds && (isNaN(parsed) || parsed <= 0)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid duration",
      message: "Seconds must be a positive number",
    });
    return;
  }
  const duration = parsed;

  const inputValue = parseInt(props.arguments.input, 10);
  const target = getSource(inputValue);

  const display = await getFirstExternalDisplay();
  if (!display) {
    await showToast({ style: Toast.Style.Failure, title: "No external display found" });
    return;
  }

  try {
    // Read current input to know what to revert to
    const currentOutput = await readInputSource(display.id);
    if (currentOutput === null) {
      await showToast({ style: Toast.Style.Failure, title: "Could not read current input source" });
      return;
    }
    const val = parseInt(currentOutput.trim(), 10);
    if (isNaN(val) || val <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Could not read current input source" });
      return;
    }
    if (val === target.value) {
      await showToast({ style: Toast.Style.Success, title: `Already on "${target.name}"` });
      return;
    }
    const originalValue = val;

    const result = await switchInputSource(display.id, target.value);
    if (result === null) return;

    let cancelled = false;
    let confirmed = false;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Previewing...",
      message: `${duration}s`,
      primaryAction: {
        title: "Cancel Preview",
        onAction: () => {
          cancelled = true;
        },
      },
      secondaryAction: {
        title: "Confirm Switch",
        onAction: () => {
          confirmed = true;
        },
      },
    });

    // Countdown
    let remaining = duration;
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (cancelled || confirmed) {
          clearInterval(interval);
          resolve();
          return;
        }
        remaining--;
        if (remaining <= 0) {
          clearInterval(interval);
          resolve();
        } else {
          toast.message = `${remaining}s`;
        }
      }, 1000);
    });

    if (confirmed) {
      // Keep the switch, store original as previous for toggle
      await setPreviousSource(originalValue);
      await showHUD(`Switched to "${target.name}" on "${display.name}"`);
    } else {
      // Revert (either cancelled or timed out)
      await switchInputSource(display.id, originalValue);
      const revertName = getSourceName(originalValue);
      await showToast({ style: Toast.Style.Success, title: `Switched back to "${revertName}"` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({ style: Toast.Style.Failure, title: "Failed to switch input", message });
  }
}
