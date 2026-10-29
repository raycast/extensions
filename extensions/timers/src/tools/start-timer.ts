import { getPreferenceValues } from "@raycast/api";
import { createCustomTimer, startTimer } from "../backend/timerBackend";
import { Preferences, TimerLaunchConfig } from "../backend/types";

type StartTimerToolInput = {
  /**
   * The amount of hours that the timer should run for. Positive number or 0.
   */
  hours: number;
  /**
   * The amount of minutes that the timer should run for. Positive number or 0.
   */
  minutes: number;
  /**
   * The amount of seconds that the timer should run for. Positive number or 0.
   */
  seconds: number;
  /**
   * Optionally, a name for the timer to be started.
   */
  name?: string;
  /**
   * Optionally, indicate whether or not this timer should be saved as a preset. Defaults to false.
   */
  shouldBeSaved?: boolean;
};

export default async function (input: StartTimerToolInput) {
  const timeInSeconds = 3600 * Number(input.hours) + 60 * Number(input.minutes) + Number(input.seconds);
  const res: TimerLaunchConfig = {
    timeInSeconds: timeInSeconds,
    timerName: input.name,
  };
  startTimer({
    ...res,
    launchedFromMenuBar: false,
    skipRingContinuouslyWarning: true,
  });
  if (input.shouldBeSaved) {
    const prefs: Preferences = getPreferenceValues();
    createCustomTimer({
      name: input.name ?? "Untitled",
      timeInSeconds: timeInSeconds,
      selectedSound: prefs.selectedSound,
      showInMenuBar: true,
    });
  }
  return {
    ...res,
    saved: input.shouldBeSaved ?? false,
  };
}
