import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import { isWeekend } from "date-fns";
import { getProgressBar, getRemainingPercentage, getRemainingTime } from "./utils/time";

export default async function Command() {
  const now = new Date();
  const { hours, minutes } = getRemainingTime(now);
  const progress = getRemainingPercentage(now);
  const { includeWeekends, startHour } = getPreferenceValues();

  if (hours < 0 || minutes < 0 || (!includeWeekends && isWeekend(now)) || now.getHours() < startHour) {
    return await updateCommandMetadata({
      subtitle: `${getProgressBar(-1)}`,
    });
  }

  await updateCommandMetadata({
    subtitle: `${getProgressBar(progress)} `,
  });
}
