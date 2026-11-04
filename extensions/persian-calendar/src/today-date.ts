import { environment, LaunchType, showHUD, updateCommandMetadata } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { faDigits, getIranToday, MONTH_NAMES } from "./jalali";

export default async function Command() {
  try {
    const today = getIranToday();
    const dateText = `امروز ${faDigits(today.jd)} ${MONTH_NAMES[today.jm - 1]} ${faDigits(today.jy)}`;

    await updateCommandMetadata({ subtitle: dateText });

    if (environment.launchType === LaunchType.UserInitiated) {
      await showHUD(dateText);
    }
  } catch (error) {
    if (environment.launchType === LaunchType.UserInitiated) {
      await showFailureToast(error, { title: "Could Not Show Today's Date" });
    } else {
      console.error("Could not refresh the Persian date in the background", error);
    }
  }
}
