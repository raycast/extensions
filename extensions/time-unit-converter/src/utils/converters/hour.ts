import { MeasureTimeEnum } from "../enum";

export function hourConverter(typeTo: string, valueFrom: number) {
  const daysInMonth = 30.44; // 1 month equal 30.44 (considering leap years)
  const millisecondsInSecond = 1000;
  const secondsInMinute = 60;
  const minutesInHour = 60;
  const nanosecondsInSecond = 1000000000;
  const hoursInDay = 24;
  const hoursInWeek = 24 * 7;
  const hoursInMonth = daysInMonth * hoursInDay;

  switch (typeTo) {
    case MeasureTimeEnum.MILISECOND:
      return valueFrom * minutesInHour * secondsInMinute * millisecondsInSecond;
    case MeasureTimeEnum.NANOSECOND:
      return valueFrom * minutesInHour * secondsInMinute * nanosecondsInSecond;
    case MeasureTimeEnum.MICROSECOND:
      return valueFrom * minutesInHour * secondsInMinute * nanosecondsInSecond;
    case MeasureTimeEnum.MINUTE:
      return valueFrom * minutesInHour;
    case MeasureTimeEnum.DAY:
      return valueFrom / hoursInDay;
    case MeasureTimeEnum.SECOND:
      return valueFrom * minutesInHour * secondsInMinute;
    case MeasureTimeEnum.WEEK:
      return valueFrom / hoursInWeek;
    case MeasureTimeEnum.MONTH:
      return valueFrom / hoursInMonth;
    default:
      return valueFrom;
  }
}
