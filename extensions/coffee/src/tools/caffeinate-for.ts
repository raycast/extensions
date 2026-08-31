import { startCaffeinate, deviceName } from "../utils";

type Input = {
  /**
   * Number of hours (optional). Must be a non-negative integer.
   */
  hours?: number;
  /**
   * Number of minutes (optional). Must be a non-negative integer.
   */
  minutes?: number;
  /**
   * Number of seconds (optional). Must be a non-negative integer.
   */
  seconds?: number;
};

/**
 * Prevents your computer from going to sleep for a specified duration
 */
export default async function (input: Input) {
  const { hours = 0, minutes = 0, seconds = 0 } = input;

  if (hours === 0 && minutes === 0 && seconds === 0) {
    throw new Error("Please specify a duration");
  }

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const formattedTime = `${hours ? `${hours}h` : ""}${minutes ? `${minutes}m` : ""}${seconds ? `${seconds}s` : ""}`;

  await startCaffeinate({ menubar: true, status: true }, undefined, `-t ${totalSeconds}`, {
    kind: "for",
    endsAt: new Date(Date.now() + totalSeconds * 1000).toISOString(),
  });

  return `${deviceName()} will stay awake for ${formattedTime}`;
}
