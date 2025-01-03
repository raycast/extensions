import { MeasureTimeEnum } from "../enum";

export function secondsConverter(typeTo: string, valueFrom: number) {
  switch (typeTo) {
    case MeasureTimeEnum.MILISECOND:
      return valueFrom * 1000;
    case MeasureTimeEnum.NANOSECOND:
      return valueFrom * 1000000000;
    case MeasureTimeEnum.MICROSECOND:
      return valueFrom * 1000000;
    case MeasureTimeEnum.MINUTE:
      return valueFrom / 3600;
    case MeasureTimeEnum.DAY:
      return valueFrom / 86400;
    case MeasureTimeEnum.WEEK:
      return valueFrom / 604800;
    case MeasureTimeEnum.MONTH:
      return valueFrom / 2592000;
    case MeasureTimeEnum.HOUR:
      return valueFrom / 3600;
    default:
      return valueFrom;
  }
}
