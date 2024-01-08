import { runAppleScript, showFailureToast } from "@raycast/utils";
import { showHUD } from "@raycast/api";
import { execSync } from "child_process";

/// The value for the Show dock mode enabled
const IS_DOCK_SHOWN = "1";

/// A class to handle the showing dock mode
class ShowDockMode {
  /// Gets the state of the show dock mode
  /// @returns the state of the clamshell mode
  getState(): boolean | undefined {
    try {
      const result = execSync(`defaults read com.apple.dock "autohide"`);
      const value = result.toString().trim().at(-1);
      return value == IS_DOCK_SHOWN;
    } catch (error) {
      showFailureToast(error, {
        title: "Could not determine the state of the dock",
      });
    }
  }

  async setState(state: boolean): Promise<void> {
    try {
      const result = state ? "true" : "false";
      const message = `✅  ${state ? "Hiding" : "Showing"} the dock`;

      await runAppleScript(`tell application "System Events" to set the autohide of the dock preferences to ${result}`);
      await showHUD(message);
    } catch (error) {
      if (error instanceof Error) {
        if (!error.message.includes("-128")) {
          showFailureToast(error, { title: "Could not Toggle Dock" });
        }
      }
    }
  }

  /// Toggles the dock mode
  /// @returns a promise that resolves when the state is toggled
  async toggle(): Promise<void> {
    const state = this.getState();
    await this.setState(!state);
  }
}

/// The ShowDock Mode
export const mode = new ShowDockMode();

/// Toggles the clamshell mode
export default async function main() {
  await mode.toggle();
}
