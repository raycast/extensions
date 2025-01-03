import { MeasureTimeEnum } from "../enum";

export function monthConverter(typeTo: string, valueFrom: number) {
  // 1 month equal 30.44 (considering leap years)
  const daysInMonth = 30.44;
  const hoursInDay = 24;
  const minutesInHour = 60;
  const secondsInMinute = 60;
  const millisecondsInSecond = 1000;
  const microsecondsInMillisecond = 1000;
  const daysInWeek = 7;

  switch (typeTo) {
    case MeasureTimeEnum.MILISECOND:
      return valueFrom * daysInMonth * hoursInDay * minutesInHour * secondsInMinute * 1000;
    case MeasureTimeEnum.NANOSECOND:
      return valueFrom * daysInMonth * hoursInDay * minutesInHour * secondsInMinute * 1000 * 1000000;
    case MeasureTimeEnum.MICROSECOND:
      return (
        valueFrom *
        daysInMonth *
        hoursInDay *
        minutesInHour *
        secondsInMinute *
        millisecondsInSecond *
        microsecondsInMillisecond
      );
    case MeasureTimeEnum.MINUTE:
      return valueFrom * daysInMonth * hoursInDay * minutesInHour;
    case MeasureTimeEnum.DAY:
      return valueFrom * daysInMonth;
    case MeasureTimeEnum.SECOND:
      return valueFrom * daysInMonth * hoursInDay * minutesInHour * secondsInMinute;
    case MeasureTimeEnum.WEEK:
      return (valueFrom * daysInMonth) / daysInWeek;
    case MeasureTimeEnum.HOUR:
      return valueFrom * daysInMonth * hoursInDay;
    default:
      return valueFrom;
  }
}
