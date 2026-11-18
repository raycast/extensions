import { LaunchType, type LaunchProps } from "@raycast/api";
import { runWithCliGuard } from "./setup/guard";
import { resetStatusSubtitles, runStatusRefresh } from "./status/refresh";

export default async function main({ launchType }: LaunchProps) {
  if (launchType === LaunchType.Background) {
    await runStatusRefresh({ showFeedback: false });
    return;
  }

  await runWithCliGuard(() => runStatusRefresh({ showFeedback: true }), {
    onUnavailable: resetStatusSubtitles,
  });
}
