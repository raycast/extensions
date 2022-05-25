export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const buildTimeByUTCTime = (dateTime: string) => {
  if (isEmpty(dateTime)) return "";
  return dateTime.substring(0, dateTime.indexOf(".")).replace("T", " ");
};

export const calculateDateTimeByOffset = (offset: string) => {
  const dt = new Date();
  dt.setDate(dt.getUTCDate());
  dt.setHours(dt.getUTCHours() + parseInt(offset));
  return {
    date_time: dt.toLocaleTimeString(),
    unixtime: dt.getTime(),
  };
};

export const makeUpTwoDigits = (str: string | number) => {
  str = str + "";
  return str.length > 1 ? str : "0" + str;
};
