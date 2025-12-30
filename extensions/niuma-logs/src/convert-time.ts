import dayjs from "dayjs";

export default function convertTime(
  dateTime: string | number | Date | undefined,
) {
  if (!dateTime) return "";
  // 获取当前时间
  const currentTime = dayjs();
  // 将传入的时间字符串转换为dayjs对象
  const oldTime = dayjs(dateTime);

  // 计算时间差
  const diffMonths = currentTime.diff(oldTime, "month");
  const diffWeeks = currentTime.diff(oldTime, "week");
  const diffDays = currentTime.diff(oldTime, "day");
  const diffHours = currentTime.diff(oldTime, "hour");
  const diffMinutes = currentTime.diff(oldTime, "minute");

  if (diffMonths >= 1 && diffMonths < 4) {
    return `${diffMonths} 月前`;
  }
  if (diffWeeks >= 1 && diffWeeks < 4) {
    return `${diffWeeks} 周前`;
  }
  if (diffDays >= 1 && diffDays < 7) {
    return `${diffDays} 天前`;
  }
  if (diffHours >= 1 && diffHours < 24) {
    return `${diffHours} 小时前`;
  }
  if (diffMinutes >= 1 && diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }
  if (diffMinutes >= 0 && diffMinutes < 1) {
    // 时间差大于0并且小于1分钟
    return `刚刚`;
  }
  return dayjs(dateTime).format("YYYY-MM-DD");
}
