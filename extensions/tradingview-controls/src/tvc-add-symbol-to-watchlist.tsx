import { LaunchProps } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { TVCLogger } from "./logger";
import { TVCOpenSymbol } from "./tvc-open-symbol";
import { TVCSymbolArg } from "./types";

const context = "src/tvc-add-symbol-to-watchlist.tsx";

/**
 * Arguments for the TVCAddSymbolToWatchlist command.
 */
type TVCAddSymbolToWatchlistArgs = TVCSymbolArg;

/**
 * Adds a symbol to the watchlist in TradingView.
 * @param props Launch arguments.
 */
export default async function TVCAddSymbolToWatchlist(
  props: LaunchProps<{ arguments: TVCAddSymbolToWatchlistArgs }>
) {
  TVCLogger.log("TVCAddSymbolToWatchlist", { ...props, context });
  TVCLogger.log("Adding symbol to watchlist in TradingView...", { context });

  await TVCOpenSymbol(props);
  await runAppleScript(`
  tell application "System Events"
    delay 1
    keystroke "w" using {option down}
  end tell`);

  TVCLogger.log("Symbol added to watchlist.", { context });
}
