import { LaunchProps, closeMainWindow, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { handleApplication } from "./handle-application";
import { launchAndFocusApplication } from "./launch-and-focus-application";
import { TVCLogger } from "./logger";
import { TVCSymbolArg } from "./types";

const context = "src/tvc-open-symbol.tsx";

/**
 * Arguments for the TVCOpenSymbol command.
 */
type TVCOpenSymbolArgs = TVCSymbolArg;

/**
 * Raycast command to open a symbol in TradingView.
 * @param props Launch arguments.
 */
export async function TVCOpenSymbol(
  props: LaunchProps<{ arguments: TVCOpenSymbolArgs }>
) {
  TVCLogger.log("TVCOpenSymbol", { context });
  TVCLogger.log(props.arguments, { context });
  TVCLogger.log("Opening symbol in TradingView...", { context });

  // Get the symbol from the arguments.
  const { symbol } = props.arguments;

  // Check if TradingView is installed.
  // If it's not, show an error and exit.
  const { isInstalled, isRunning } = await handleApplication();

  if (!isInstalled) {
    TVCLogger.error("TradingView is not installed.", { context });
    TVCLogger.error("Please install it and try again.", { context });
    showToast({
      style: Toast.Style.Failure,
      title: "TradingView is not installed.",
      message: "Please install it and try again.",
    });
  } else {
    // Close the main window to prevent it from stealing focus.
    await closeMainWindow();

    // Check if TradingView is running and open it if it's not.
    if (!isRunning) {
      TVCLogger.log("TradingView is not running.", { context });
      // try to activate again
      const retryStatus = await launchAndFocusApplication();
      if (!retryStatus) {
        TVCLogger.error("TradingView did not launch in time.", { context });
        TVCLogger.error(
          "Please try opening the TradingView app manually, then trying again.",
          { context }
        );
        showToast({
          style: Toast.Style.Failure,
          title: "TradingView did not launch in time.",
          message:
            "Please try opening the TradingView app manually, then trying again.",
        });
      }
    }

    // Then, activate the app and open the symbol.
    TVCLogger.log("Running AppleScript...", { context });
    await runAppleScript(`
      set symbol to "${symbol}"
      tell application "System Events"
        if symbol starts with "B" or symbol starts with "b" then
          key code 11
          delay 0.01
          keystroke text 2 thru -1 of symbol
          keystroke return
        else
          keystroke symbol
          keystroke return
        end if
      end tell`);
    TVCLogger.log("AppleScript executed.", { context });

    TVCLogger.log("Symbol opened in TradingView.", { context });
  }
}

export default TVCOpenSymbol;
