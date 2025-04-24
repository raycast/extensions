import { LaunchProps } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { TVCLogger } from "./logger";
import { TVCChangeChartInterval } from "./tvc-change-chart-interval";
import { TVCOpenSymbol } from "./tvc-open-symbol";
import { TVCChangeChartIntervalArgs, TVCTakeChartScreenshotArgs } from "./types";

const context = "src/tvc-take-chart-screenshot.tsx";

export async function TVCTakeChartScreenshot(props: LaunchProps<{ arguments: TVCTakeChartScreenshotArgs }>) {
  TVCLogger.log("TVCTakeChartScreenshot", { ...props, context });
  TVCLogger.log("Taking screenshot of symbol in TradingView...", { context });

  // Open the symbol in TradingView.
  await TVCOpenSymbol(props);

  if (!props.arguments.interval) {
    props.arguments.interval = "60";
  }

  await TVCChangeChartInterval({
    ...props,
    arguments: props.arguments as TVCChangeChartIntervalArgs,
  });

  // Take a screenshot of the chart.
  await runAppleScript(`
  tell application "System Events"
    delay 1
    keystroke "s" using {option down, command down}
  end tell`);

  TVCLogger.log("Screenshot taken.", { context });
}

export default TVCTakeChartScreenshot;
