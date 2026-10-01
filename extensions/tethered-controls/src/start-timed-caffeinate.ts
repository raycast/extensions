import { LaunchProps, showToast, Toast } from "@raycast/api";
import { runControl } from "./run-control";

export default async function Command({
  arguments: { minutes: rawMinutes },
}: LaunchProps<{ arguments: Arguments.StartTimedCaffeinate }>): Promise<void> {
  const value = rawMinutes.trim();
  const minutes = Number(value);
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(minutes) ||
    minutes < 1 ||
    minutes > 1440
  ) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Enter a duration from 1 to 1440 minutes",
    });
    return;
  }
  await runControl(
    `/caffeinate/timed?minutes=${minutes}`,
    `Start Caffeinate for ${minutes} minute${minutes === 1 ? "" : "s"}`,
  );
}
