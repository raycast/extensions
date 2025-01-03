import { MeasureTimeEnum } from "../enum";

export function milisecondsConverter(typeTo: string, valueFrom: number) {
  switch (typeTo) {
    case MeasureTimeEnum.SECOND:
      return valueFrom / 1000;
    case MeasureTimeEnum.NANOSECOND:
      return valueFrom * 1000000;
    case MeasureTimeEnum.MICROSECOND:
      return valueFrom * 1000;
    case MeasureTimeEnum.MINUTE:
      return valueFrom / 60000;
    case MeasureTimeEnum.DAY:
      return valueFrom / 86400000;
    case MeasureTimeEnum.WEEK:
      return valueFrom / 604800000;
    case MeasureTimeEnum.MONTH:
      return valueFrom / 2592000000;
    case MeasureTimeEnum.HOUR:
      return valueFrom / 3600000;
    default:
      return valueFrom;
  }
}
