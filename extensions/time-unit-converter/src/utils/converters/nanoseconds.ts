import { MeasureTimeEnum } from "../enum";

export function nanosecondsConverter(typeTo: string, valueFrom: number) {
  switch (typeTo) {
    case MeasureTimeEnum.MILISECOND:
      return valueFrom / 1000000;
    case MeasureTimeEnum.WEEK:
      return valueFrom / 604800000000000;
    case MeasureTimeEnum.MICROSECOND:
      return valueFrom / 1000;
    case MeasureTimeEnum.MINUTE:
      return valueFrom / 60000000000000;
    case MeasureTimeEnum.DAY:
      return valueFrom / 864000000000000000;
    case MeasureTimeEnum.SECOND:
      return valueFrom / 1000000000;
    case MeasureTimeEnum.MONTH:
      return valueFrom / 2592000000000000;
    case MeasureTimeEnum.HOUR:
      return valueFrom / 3600000000000000;
    default:
      return valueFrom;
  }
}
