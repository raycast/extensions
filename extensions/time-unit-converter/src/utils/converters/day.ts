import { MeasureTimeEnum } from "../enum";

export function dayConverter(typeTo: string, valueFrom: number) {
  switch (typeTo) {
    case MeasureTimeEnum.MILISECOND:
      return valueFrom * 86400000;
    case MeasureTimeEnum.NANOSECOND:
      return valueFrom * 86400000000000;
    case MeasureTimeEnum.MICROSECOND:
      return valueFrom * 86400000000;
    case MeasureTimeEnum.MINUTE:
      return valueFrom * 1440;
    case MeasureTimeEnum.SECOND:
      return valueFrom * 86400;
    case MeasureTimeEnum.WEEK:
      return valueFrom / 7;
    case MeasureTimeEnum.MONTH:
      return valueFrom / 30.44;
    case MeasureTimeEnum.HOUR:
      return valueFrom * 24;
    default:
      return valueFrom;
  }
}
