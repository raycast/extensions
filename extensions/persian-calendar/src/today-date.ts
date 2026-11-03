import { environment, LaunchType, showHUD, updateCommandMetadata } from "@raycast/api";

import { faDigits, getIranToday, MONTH_NAMES } from "./jalali";

export default async function Command() {
  // Get today's date in Iran's timezone.
  const today = getIranToday();

  // Format the date using Persian month names and numerals.
  const dateText = `امروز ${faDigits(today.jd)} ${MONTH_NAMES[today.jm - 1]} ${faDigits(today.jy)}`;

  // Display the date beside the command in Raycast search.
  await updateCommandMetadata({
    subtitle: dateText,
  });

  // Show a notification only when the user launches the command.
  if (environment.launchType === LaunchType.UserInitiated) {
    await showHUD(dateText);
  }
}
