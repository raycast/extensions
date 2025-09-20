import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

export const utcTimeAgo = (utcTime: string) => {
  dayjs.extend(relativeTime);
  dayjs().fromNow();
  return dayjs().to(dayjs(utcTime));
};
