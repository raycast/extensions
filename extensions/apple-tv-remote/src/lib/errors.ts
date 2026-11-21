import { LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

/** A failure the user can act on: its toast title, and whether pairing again fixes it. */
export class AppleTVError extends Error {
  constructor(
    message: string,
    readonly title = "Apple TV Error",
    readonly needsSetup = false,
  ) {
    super(message);
  }
}

export class NotPairedError extends AppleTVError {
  constructor() {
    super("No Apple TV is set up yet. Run “Set up Apple TV” to pair one.", "No Apple TV Set Up", true);
  }
}

/** The Apple TV answered the handshake and rejected the stored pairing. */
export class PairingExpiredError extends AppleTVError {
  constructor() {
    super("The Apple TV no longer accepts this pairing. Pair it again to continue.", "Pairing Expired", true);
  }
}

/** The Apple TV did not answer (asleep, restarting, off the network, new address). */
export class UnreachableError extends AppleTVError {
  constructor(deviceName: string) {
    super(`Could not reach “${deviceName}”. Is it powered on and on the same network?`, "Apple TV Unreachable");
  }
}

/** The Apple TV answered, and said no (an error frame, e.g. a launch it will not perform). */
export class RefusedError extends AppleTVError {
  constructor(identifier: string, detail: string) {
    super(`The Apple TV refused ${identifier} (${detail}).`, "Apple TV Refused");
  }
}

/** A failure toast for any error; pairing problems get a one-step "Set up Apple TV" action. */
export async function showErrorToast(error: unknown): Promise<void> {
  const known = error instanceof AppleTVError ? error : null;
  await showToast({
    style: Toast.Style.Failure,
    title: known?.title ?? "Apple TV Error",
    message: error instanceof Error ? error.message : String(error),
    primaryAction: known?.needsSetup
      ? {
          title: "Set up Apple TV",
          onAction: () =>
            launchCommand({ name: "setup", type: LaunchType.UserInitiated }).catch((e) =>
              showFailureToast(e, { title: "Couldn't Open Setup" }),
            ),
        }
      : undefined,
  });
}
