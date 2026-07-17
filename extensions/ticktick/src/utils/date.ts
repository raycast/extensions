import moment from "moment-timezone";

export const convertMacTime2JSTime = (time: number) => {
  return time * 1000;
};

export const getSectionNameByDate = (date: Date) => {
  const sectionDateMM = moment(date);
  if (moment().subtract(1, "days").isSame(date, "day")) {
    return "Overdue";
  }

  if (moment().isSame(date, "day")) {
    return "Today";
  }

  if (
    moment().add(1, "days").isSame(date, "day") ||
    moment().add(2, "days").isSame(date, "day") ||
    moment().add(3, "days").isSame(date, "day") ||
    moment().add(4, "days").isSame(date, "day") ||
    moment().add(5, "days").isSame(date, "day") ||
    moment().add(6, "days").isSame(date, "day")
  ) {
    return sectionDateMM.format("ddd, MMM Do");
  }

  return "";
};

export const formatToServerDate = (date: Date | moment.Moment | null | undefined) => {
  if (date) return moment(date).utc().millisecond(0).format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
  return undefined;
};

export const formatPrettyDateTime = (date: string, timezone: string, isFloating: boolean, isAllDay: boolean) => {
  if (!date) return "";
  const dateInUTC = moment.utc(date);
  if (!dateInUTC.isValid()) return "";
  const datetimeInOriginalTimezone = moment.tz(dateInUTC, timezone);
  if (isAllDay) {
    return datetimeInOriginalTimezone.format("MMM Do");
  } else if (isFloating) {
    return datetimeInOriginalTimezone.format("MMM Do, h:mm a");
  } else {
    const datetimeInLocalTimezone = dateInUTC.clone().local();
    return datetimeInLocalTimezone.format("MMM Do, h:mm a");
  }
};
