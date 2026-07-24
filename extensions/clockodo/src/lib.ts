import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";

dayjs.extend(duration);

export const formatDuration = (durationInSeconds: number) => {
  const d = dayjs.duration(durationInSeconds, "seconds");
  return d.format("HH:mm");
};

export { dayjs };
