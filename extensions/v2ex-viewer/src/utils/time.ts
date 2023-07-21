import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";
import "dayjs/locale/zh-cn";

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

export const getUnixFromNow = (t: number) => {
  return dayjs.unix(t).fromNow();
};
export default dayjs;
