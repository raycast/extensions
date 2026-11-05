import { environment, LaunchType, showHUD, updateCommandMetadata } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { faDigits, getIranToday, MONTH_NAMES, weekdayIndex, WEEKDAYS } from "./jalali";

export default async function Command() {
  try {
    // Get today's date in Iran's timezone.
    const today = getIranToday();

    // Calculate the correct Persian weekday.
    const weekday = WEEKDAYS[weekdayIndex(today.gy, today.gm, today.gd)];

    // Format the full date with weekday and Persian numerals.
    const dateText = `امروز ${weekday}، ${faDigits(today.jd)} ${MONTH_NAMES[today.jm - 1]} ${faDigits(today.jy)}`;

    // Show the full date beside the command in Raycast search.
    await updateCommandMetadata({
      subtitle: dateText,
    });

    // Show the date when the user launches the command.
    if (environment.launchType === LaunchType.UserInitiated) {
      await showHUD(dateText);
    }
  } catch (error) {
    if (environment.launchType === LaunchType.UserInitiated) {
      await showFailureToast(error, {
        title: "Could Not Show Today's Date",
      });
    } else {
      console.error("Could not refresh the Persian date in the background", error);
    }
  }
}
