import { runAppleScript } from "run-applescript";

/**
 * Launches and focuses the TradingView application. Returns the run status of the application after the activation.
 * @returns true if the application is running, false if the application somehow closes after activation
 */
export async function launchAndFocusApplication() {
  const output = await runAppleScript(`
    on is_running(appName)
      tell application "System Events" to (name of processes) contains appName
    end is_running
    set tvIsRunning to is_running("TradingView")
    if not tvIsRunning then
      tell application "TradingView" to launch
      repeat until is_running("TradingView")
        delay 0.1
      end repeat
      delay 4
    end if
    tell application "TradingView" to activate
    delay 1
    return is_running("TradingView")
  `);
  return JSON.parse(output) as boolean;
}
