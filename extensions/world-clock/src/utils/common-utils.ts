export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const buildTimeByUTCTime = (dateTime: string) => {
  if (isEmpty(dateTime)) return "";
  return dateTime.substring(0, dateTime.indexOf(".")).replace("T", " ");
};
