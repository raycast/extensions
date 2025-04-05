import { closeMainWindow, getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { setVariableAppleScript, setVariableUrl } from "../api";
import { SetVariableValue } from "../types";

type InputVariableValue = { type: "string"; value?: string } | { type: "number"; value?: number };

/**
 * Sets a BetterTouchTool variable with validation
 *
 * @param variableName - The name of the variable to set
 * @param variableValue - The value to set, must be properly typed and validated before calling:
 *   - For strings: { type: "string", value: "your string value" }
 *   - For numbers: { type: "number", value: 123 } (must be a valid number, not NaN)
 * @param persistence - Whether the variable should be "temporary" or "persistent"
 *
 * @returns A Promise that resolves when the operation is complete
 */
export async function setVariableImplementation(
  variableName: string,
  variableValue: InputVariableValue,
  persistence: "temporary" | "persistent" | undefined,
): Promise<void> {
  // Get the preference value
  const { bttSetVariableDefaultAction } = getPreferenceValues<Preferences.SetStringVariable>();
  persistence = persistence || "temporary";

  // Determine if we should close the window based on the action type
  const shouldKeepWindowOpen = bttSetVariableDefaultAction === "applescript";

  // Close window immediately if needed
  if (shouldKeepWindowOpen) {
    await showToast({
      title: "Setting Variable...",
      style: Toast.Style.Animated,
    });
  } else {
    await closeMainWindow();
  }

  const isPersistent = persistence === "persistent";
  // Create properly typed values for the API calls
  const typedValue: SetVariableValue =
    variableValue.type === "string"
      ? {
          type: "string",
          value: variableValue.value || "",
        }
      : {
          type: "number",
          value: variableValue.value || 0,
        };

  // Use URL or AppleScript based on user preference
  const useAppleScript =
    bttSetVariableDefaultAction === "applescript" || bttSetVariableDefaultAction === "applescript_close";
  const result = useAppleScript
    ? await setVariableAppleScript(variableName, typedValue, isPersistent)
    : await setVariableUrl(variableName, typedValue, isPersistent);

  // Handle the result
  if (result.status === "error") {
    await showFailureToast(result.error, {
      title: "Failed to Set Variable",
      primaryAction: {
        title: "View Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return;
  }

  const successMessage = `Set ${persistence} variable "${variableName}" successfully`;
  await showToast({
    title: successMessage,
    style: Toast.Style.Success,
  });
}
