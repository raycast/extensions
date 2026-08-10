import { LaunchProps } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { TVCLogger } from "./logger";
import { TVCChangeChartIntervalArgs } from "./types";

const context = "src/tvc-add-symbol-to-watchlist.tsx";

/**
 * Changes the interval of a chart in TradingView.
 * @param props Launch arguments.
 */
export async function TVCChangeChartInterval(
  props: LaunchProps<{ arguments: TVCChangeChartIntervalArgs }>
) {
  const { interval } = props.arguments;
  TVCLogger.log("TVCChangeChartInterval", { ...props, context });
  TVCLogger.log("Changing chart interval in TradingView...", { context });

  await runAppleScript(`
  set interval to "${interval ?? 60}"
  tell application "System Events"
    keystroke ","
    keystroke interval
    keystroke return
  end tell`);

  TVCLogger.log("Changed chart interval.", { context });
}

export default TVCChangeChartInterval;
