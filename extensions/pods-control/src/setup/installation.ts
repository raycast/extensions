import { confirmAlert, showToast, Toast } from "@raycast/api";
import { createCopyErrorAction, getErrorMessage } from "../feedback/error-actions";
import { installCliWithBrew, updateCliWithBrew } from "../homebrew/commands";
import { detectCliSetup, type CliSetup } from "./detection";
import { openCliSetup } from "./navigation";

export type CliOperation = "install" | "update";
const READY_MESSAGE = "Run your command again.";
let pendingPrompt: Promise<void> | undefined;
let pendingOperation: Promise<CliSetup> | undefined;

export async function runBrewOperationWithProgress<T>(toast: Toast, operation: () => Promise<T>): Promise<T> {
  let pendingShow: Promise<void> | undefined;
  // Re-show the same toast without letting a late refresh overwrite the result.
  const timer = setInterval(() => {
    if (pendingShow) return;
    pendingShow = toast
      .show()
      .catch((error) => console.error("Could not refresh installation progress", error))
      .finally(() => {
        pendingShow = undefined;
      });
  }, 3000);
  try {
    return await operation();
  } finally {
    clearInterval(timer);
    await pendingShow;
  }
}

export function runCliInstallation(operation: CliOperation): Promise<CliSetup> {
  pendingOperation ??= performInstallation(operation).finally(() => {
    pendingOperation = undefined;
  });
  return pendingOperation;
}

async function performInstallation(operation: CliOperation): Promise<CliSetup> {
  let toast: Toast | undefined;
  try {
    const before = await detectCliSetup();
    // Installation may have finished elsewhere while the confirmation was open.
    if (operation === "install" && before.cliPath) {
      if (before.meetsMinimum !== true) {
        throw new Error(
          "Another install finished, but the CLI is not ready to use. Open CLI Setup to check the installation.",
        );
      }
      await showToast({ style: Toast.Style.Success, title: "pods-control CLI ready", message: READY_MESSAGE });
      return before;
    }
    if (before.state !== operation) {
      throw new Error("Setup has changed. Choose the Refresh action in the setup view, then try again.");
    }
    toast = await showToast({
      style: Toast.Style.Animated,
      title: operation === "install" ? "Installing pods-control CLI…" : "Updating pods-control CLI…",
      message: "This can take several minutes. Keep Raycast running until it finishes.",
    });
    const after = await runBrewOperationWithProgress(toast, async () => {
      await (operation === "install" ? installCliWithBrew() : updateCliWithBrew());
      return detectCliSetup();
    });
    if (after.state !== "update" || after.meetsMinimum !== true) {
      throw new Error("Homebrew finished, but the CLI is not ready to use. Open CLI Setup to check the installation.");
    }
    toast.style = Toast.Style.Success;
    toast.title = "pods-control CLI ready";
    toast.message = READY_MESSAGE;
    await toast.show();
    return after;
  } catch (error) {
    const message = getErrorMessage(error);
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: operation === "install" ? "pods-control CLI installation failed" : "pods-control CLI update failed",
      message,
      primaryAction: { title: "Open pods-control CLI Setup", onAction: openCliSetup },
      secondaryAction: createCopyErrorAction(message),
    };
    if (toast) {
      Object.assign(toast, options);
      await toast.show();
    } else {
      await showToast(options);
    }
    throw error;
  }
}

/** Setup never runs the command that originally required the CLI. */
export function promptForCliInstallation(): Promise<void> {
  pendingPrompt ??= offerInstallation().finally(() => {
    pendingPrompt = undefined;
  });
  return pendingPrompt;
}

async function offerInstallation(): Promise<void> {
  let setup: CliSetup;
  try {
    setup = await detectCliSetup();
  } catch {
    // The persistent view shows detection errors and provides a retry action.
    await openCliSetup();
    return;
  }
  if (setup.cliPath && setup.meetsMinimum === true) {
    await showToast({ style: Toast.Style.Success, title: "pods-control CLI ready", message: READY_MESSAGE });
    return;
  }
  if (setup.state !== "install") {
    await openCliSetup();
    return;
  }
  const confirmed = await confirmAlert({
    title: "Install pods-control CLI?",
    message:
      "Install the CLI to control AirPods and Beats from Raycast. Homebrew can take several minutes. When it finishes, run your command again.",
    primaryAction: { title: "Install with Homebrew" },
    dismissAction: { title: "Cancel" },
  });
  if (!confirmed) return;
  try {
    await runCliInstallation("install");
  } catch {
    // The shared installer has already shown the error and recovery actions.
  }
}
