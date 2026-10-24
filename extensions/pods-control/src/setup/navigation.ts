import { launchCommand, LaunchType, open, showToast, Toast } from "@raycast/api";
import { CLI_SETUP_COMMAND_NAME } from "../commands/names";
import { createCopyErrorAction, getErrorMessage } from "../feedback/error-actions";
import { CLI_INSTALL_DOCS_URL } from "./constants";

export async function openCliSetup(): Promise<void> {
  try {
    await launchCommand({ name: CLI_SETUP_COMMAND_NAME, type: LaunchType.UserInitiated });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open CLI setup",
      message: "Enable Manage CLI in Raycast preferences, or follow the installation instructions.",
      primaryAction: { title: "Open Installation Instructions", onAction: () => open(CLI_INSTALL_DOCS_URL) },
      secondaryAction: createCopyErrorAction(getErrorMessage(error)),
    });
  }
}
