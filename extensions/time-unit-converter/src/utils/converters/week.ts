import { MeasureTimeEnum } from "../enum";

export function weekConverter(typeTo: string, valueFrom: number) {
  switch (typeTo) {
    case MeasureTimeEnum.MILISECOND:
      return valueFrom * 604800000;
    case MeasureTimeEnum.NANOSECOND:
      return valueFrom * 604800000000000;
    case MeasureTimeEnum.MICROSECOND:
      return valueFrom * 604800000000;
    case MeasureTimeEnum.MINUTE:
      return valueFrom * 10080;
    case MeasureTimeEnum.DAY:
      return valueFrom * 7;
    case MeasureTimeEnum.SECOND:
      return valueFrom * 604800;
    case MeasureTimeEnum.MONTH:
      return valueFrom / 4.345;
    case MeasureTimeEnum.HOUR:
      return valueFrom * 168;
    default:
      return valueFrom;
  }
}
