import { LaunchType, launchCommand } from "@raycast/api";
import { recordWatchdogArmAttempt } from "./dynamic-pomodoro-watchdog-diagnostics";

export async function armWatchdogInBackground(): Promise<void> {
  const launchType = LaunchType.Background;
  try {
    await launchCommand({
      name: "dynamic-pomodoro-watchdog",
      type: launchType,
    });
    await recordWatchdogArmAttempt({ launchType });
  } catch (error) {
    await recordWatchdogArmAttempt({ launchType, error });
  }
}
