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

export const calculateTimeInfoByOffset = (unixtime: number, offset: string) => {
  let unixtimeStr = unixtime + "";
  unixtimeStr = unixtimeStr.length === 10 ? unixtimeStr + "000" : unixtimeStr;
  //local current time
  const dateTime = new Date(parseInt(unixtimeStr));
  dateTime.setDate(dateTime.getUTCDate());
  dateTime.setHours(dateTime.getUTCHours() + parseInt(offset));
  //utc time
  const utc = new Date(parseInt(unixtimeStr));
  utc.setDate(utc.getDate());
  utc.setHours(utc.getUTCHours());
  return {
    date_time: dateTime.toLocaleString(),
    time: dateTime.toLocaleTimeString(),
    utc_datetime: utc.toLocaleString(),
  };
};
