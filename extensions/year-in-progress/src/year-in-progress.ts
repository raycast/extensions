import { environment, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { getDayOfYear, isLeapYear } from "date-fns";

export default async function command() {
  const now = new Date();
  const dayOfYear = getDayOfYear(now);
  const daysInYear = isLeapYear(now) ? 366 : 365;
  const progress = (dayOfYear / daysInYear) * 100;

  const formatter = new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const formattedProgress = formatter.format(progress / 100);

  let progressBar = "";
  for (let i = 0; i < 10; i++) {
    progressBar += progress > i * 10 ? "■" : "□";
  }

  updateCommandMetadata({ subtitle: `${progressBar} ${formattedProgress}` });

  if (environment.launchType === LaunchType.UserInitiated) {
    await showToast({
      style: Toast.Style.Success,
      title: "Refreshed progress",
      message: `${progressBar} ${formattedProgress}`,
    });
  }
}
