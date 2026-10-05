import { isFocusRunning, takeBreak5, takeBreakCustom } from "../utils";

type Input = {
  /**
   * Duration of the break in minutes. Defaults to 5 minutes if not specified.
   */
  minutes?: number;
};

/**
 * Takes a break from the current focus session. Defaults to 5 minutes.
 * Specify a duration in minutes for a custom break length.
 */
export default async function tool(input: Input) {
  const isRunning = await isFocusRunning();
  if (!isRunning) {
    return "No active focus session found — cannot start a break.";
  }
  if (input.minutes && input.minutes > 0) {
    await takeBreakCustom(input.minutes);
    return `${input.minutes}-minute break started.`;
  } else {
    await takeBreak5();
    return "5-minute break started.";
  }
}
