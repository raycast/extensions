import { LaunchProps, closeMainWindow } from '@raycast/api';
import { runAppleScript } from 'run-applescript';
import { TVCLogger } from './logger';
import { TVCSymbolArg } from './types';

const context = 'src/tvc-open-symbol.tsx'

/**
 * Arguments for the TVCOpenSymbol command.
 */
interface TVCOpenSymbolArgs extends TVCSymbolArg {}

/**
 * Raycast command to open a symbol in TradingView.
 * @param props Launch arguments.
 */
export async function TVCOpenSymbol(props: LaunchProps<{ arguments: TVCOpenSymbolArgs }>) {
  TVCLogger.log('TVCOpenSymbol', { context });
  TVCLogger.log(props.arguments, { context })
  TVCLogger.log('Opening symbol in TradingView...', { context })

  // Get the symbol from the arguments.
	const { symbol } = props.arguments;

  // Close the main window to prevent it from stealing focus.
	await closeMainWindow();

  // Check if TradingView is running and open it if it's not.
  // Then, activate the app and open the symbol.
  TVCLogger.log('Running AppleScript...', { context })
	await runAppleScript(`
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
  TVCLogger.log('AppleScript executed.', { context })

  TVCLogger.log('Symbol opened in TradingView.', { context })
}

export default TVCOpenSymbol;
