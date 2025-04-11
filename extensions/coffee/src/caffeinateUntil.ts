import { showToast, Toast } from "@raycast/api";
import { startCaffeinate } from "./utils";

export default async function Command(props: { arguments: Arguments.CaffeinateUntil }) {
  const { time } = props.arguments;
  const pattern = /^(\d{1,2})(?::(\d\d))? *(am|pm)?$/i;

  if (!pattern.test(time)) {
    await showToast(Toast.Style.Failure, "Unrecognized time format");
    return;
  }

  const [, hourStr, minuteStr, ampm] = pattern.exec(time) ?? [];
  const inputHour = Number(hourStr);
  let hour = inputHour;
  if (ampm?.toLowerCase() == "pm" && inputHour < 12) hour += 12;
  if (ampm?.toLowerCase() == "am" && inputHour == 12) hour = 0;
  const minute = minuteStr ? Number(minuteStr) : 0;

  if (hour < 0 || hour > 24 || minute < 0 || minute > 59) {
    await showToast(Toast.Style.Failure, "Unrecognized time format");
    return;
  }

  const now = new Date();
  const target = new Date();
  target.setHours(hour);
  target.setMinutes(minute);
  target.setSeconds(0);

  // If we have ampm or a 24-hour time, assume it's explicit and use the next day.
  // Otherwise, find the next occurrence of the given 12-hour time.
  const is24h = ampm || hour > 12 || hourStr.startsWith("0");
  while (target <= now) {
    target.setHours(target.getHours() + (is24h ? 24 : 12));
  }

  const totalSeconds = (target.getTime() - now.getTime()) / 1000;
  const formattedTime = target.toLocaleTimeString([], { timeStyle: "short" });
  const tomorrow = target.getDate() != now.getDate() ? "tomorrow at " : "";

  await startCaffeinate(
    { menubar: true, status: true },
    `Caffeinating your Mac until ${tomorrow}${formattedTime}`,
    `-t ${totalSeconds}`,
  );
}
