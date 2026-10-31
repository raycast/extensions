import { showFailureToast } from "@raycast/utils";
import { isCliInstalled } from "../cli/discovery";
import { createCopyErrorAction, getErrorMessage } from "../feedback/error-actions";
import { promptForCliInstallation } from "./installation";

/** Offer setup when the CLI is missing without running the requested action. */
export async function runWithCliGuard(
  perform: () => Promise<void>,
  options: { onUnavailable?: () => Promise<void> } = {},
): Promise<void> {
  try {
    if (!isCliInstalled()) {
      await options.onUnavailable?.();
      await promptForCliInstallation();
      return;
    }
    await perform();
  } catch (error) {
    // perform() reports its own failures; this is a last resort for unexpected ones.
    const message = getErrorMessage(error);
    await showFailureToast(error, {
      title: "Command failed",
      message,
      primaryAction: createCopyErrorAction(message),
    });
  }
}
