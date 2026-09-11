import { openExtensionPreferences, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { errorHint, errorMessage } from "./domain/failure";

export { errorHint, errorMessage } from "./domain/failure";

const OPEN_PREFERENCES: Toast.ActionOptions = {
  title: "Open Extension Preferences",
  onAction: () => {
    openExtensionPreferences();
  },
};

/** Failure toast that explains what to do next and offers a shortcut to the preferences. */
export function showNamecheapError(error: unknown, title: string): Promise<Toast> {
  const hint = errorHint(error);
  return showFailureToast(error, {
    title,
    message: hint ? `${errorMessage(error)} — ${hint}` : errorMessage(error),
    primaryAction: hint ? OPEN_PREFERENCES : undefined,
  });
}
