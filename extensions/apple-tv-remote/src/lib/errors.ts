import { Toast, showToast, launchCommand, LaunchType } from "@raycast/api";

/** No Apple TV has been set up yet (no stored device/credentials). */
export class NotPairedError extends Error {
  constructor() {
    super("No Apple TV is set up yet. Run “Set up Apple TV” to pair one.");
    this.name = "NotPairedError";
  }
}

/** The Apple TV could not be reached (offline, network change, timeout). */
export class UnreachableError extends Error {
  constructor(deviceName: string) {
    super(`Could not reach “${deviceName}”. Is it powered on and on the same network?`);
    this.name = "UnreachableError";
  }
}

async function openSetup() {
  try {
    await launchCommand({ name: "setup", type: LaunchType.UserInitiated });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't Open Setup",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Show a failure toast appropriate for the error. Pairing problems get a
 * "Set Up Apple TV" action so the user can fix them in one step.
 */
export async function showErrorToast(error: unknown): Promise<void> {
  if (error instanceof NotPairedError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Apple TV Set Up",
      message: error.message,
      primaryAction: { title: "Set up Apple TV", onAction: openSetup },
    });
    return;
  }

  if (error instanceof UnreachableError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Apple TV Unreachable",
      message: error.message,
    });
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  // Pair-verify failures mean the stored credentials are no longer valid.
  const looksLikeAuth = /pair|verify|auth|credential/i.test(message);
  await showToast({
    style: Toast.Style.Failure,
    title: looksLikeAuth ? "Pairing Expired" : "Apple TV Error",
    message: looksLikeAuth ? "Re-pair with your Apple TV to continue." : message,
    primaryAction: looksLikeAuth ? { title: "Set up Apple TV", onAction: openSetup } : undefined,
  });
}
