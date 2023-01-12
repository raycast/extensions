import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

const getUnixFromNow = (t: number) => {
  return dayjs.unix(t).fromNow();
};
export { getUnixFromNow };
