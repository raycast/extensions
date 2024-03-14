import dayjs from "dayjs";

export function getTimeStamp(value: string | Date, format: string): string {
  value = value || new Date();
  return dayjs(value).format(format);
}
