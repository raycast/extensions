// Shared glue between the commands and Raycast.
import { getPreferenceValues, Icon, openExtensionPreferences, Action, showToast, Toast } from "@raycast/api";
import { PortcheckError, resolveBinary } from "./portcheck";

export function binary(): string {
  return resolveBinary(getPreferenceValues<Preferences>().portcheckPath);
}

export async function showError(err: unknown, title = "portcheck failed"): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  await showToast({
    style: Toast.Style.Failure,
    title: err instanceof PortcheckError && err.missing ? "portcheck isn't installed" : title,
    message,
    primaryAction:
      err instanceof PortcheckError && err.missing
        ? { title: "Open Preferences", onAction: () => void openExtensionPreferences() }
        : undefined,
  });
}

export function PreferencesAction() {
  return <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />;
}
