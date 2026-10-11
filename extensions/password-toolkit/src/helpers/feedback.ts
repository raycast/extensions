import { Alert, Toast, confirmAlert, showHUD, showToast } from "@raycast/api";

export async function showCopyFeedback(title: string, showFeedback: boolean): Promise<void> {
  if (!showFeedback) {
    return;
  }

  await showHUD(title);
}

export async function showFailureToast(title: string, message: string): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
  });
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function confirmPassphraseStrength(entropyBits: number): Promise<boolean> {
  if (entropyBits >= 77) {
    return true;
  }

  return confirmAlert({
    title: "Weak Passphrase Settings",
    message:
      "This format may be easy to guess. Use at least six EFF words for a stronger passphrase, or add more random characters.",
    primaryAction: { title: "Use Anyway" },
    dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
  });
}
