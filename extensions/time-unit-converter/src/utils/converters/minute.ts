import { MeasureTimeEnum } from "../enum";

export function minuteConverter(typeTo: string, valueFrom: number) {
  switch (typeTo) {
    case MeasureTimeEnum.MILISECOND:
      return valueFrom * 60000;
    case MeasureTimeEnum.NANOSECOND:
      return valueFrom * 60000000000;
    case MeasureTimeEnum.MICROSECOND:
      return valueFrom * 60000000;
    case MeasureTimeEnum.DAY:
      return valueFrom / 1440;
    case MeasureTimeEnum.SECOND:
      return valueFrom * 60;
    case MeasureTimeEnum.WEEK:
      return valueFrom / 10080;
    case MeasureTimeEnum.MONTH:
      return valueFrom / 43200;
    case MeasureTimeEnum.HOUR:
      return valueFrom / 60;
    default:
      return valueFrom;
  }
}
