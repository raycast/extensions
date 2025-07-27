// 判断当前时间是否在近一周内
export const isRecent = (date: Date) => {
  const now = new Date();
  const target = new Date(date);
  return now.getTime() - target.getTime() < 7 * 24 * 60 * 60 * 1000;
};
