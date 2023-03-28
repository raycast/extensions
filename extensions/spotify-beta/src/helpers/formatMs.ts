import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

export function formatMs(ms: number) {
  const d = dayjs.duration(ms);
  const hours = d.hours();
  const minutes = d.minutes();
  const seconds = d.seconds();

  const formattedHours = hours > 0 ? `${hours}:` : "";
  const formattedMinutes = hours > 0 ? String(minutes).padStart(2, "0") : minutes;
  const formattedSeconds = String(seconds).padStart(2, "0");

  return `${formattedHours}${formattedMinutes}:${formattedSeconds}`;
}
