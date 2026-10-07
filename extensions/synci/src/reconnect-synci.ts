import { copyDiagnostics } from "./components/diagnostics";
import { LaunchType, popToRoot, showToast, Toast } from "@raycast/api";
import { session } from "./lib/auth";
import { launchCommandWithFeedback } from "./lib/launch-command";

export default async function ReconnectSynci() {
  try {
    await session.reconnect();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Reconnect Synci",
      message: error instanceof Error ? error.message : "Try again to update account access.",
      secondaryAction: { title: "Copy Error Details", onAction: () => copyDiagnostics(error) },
      primaryAction: {
        title: "Try Again",
        onAction: () =>
          launchCommandWithFeedback(
            { name: "reconnect-synci", type: LaunchType.UserInitiated },
            "Could Not Open Reconnect Synci",
          ),
      },
    });
    await popToRoot({ clearSearchBar: true });
    return;
  }

  await showToast({
    style: Toast.Style.Success,
    title: "Synci Reconnected",
    message: "Account access and permissions updated.",
  });
  // Finish UI work before leaving the command, which can unload its worker.
  // Clear the OAuth screen and command together so Back cannot reopen consent.
  await popToRoot({ clearSearchBar: true });
}
