import { formatDistance } from "date-fns";

export function timeCalculator(seconds: number): string {
  const date = new Date(0);
  date.setSeconds(seconds);

  return formatDistance(date, new Date(0), { includeSeconds: false });
}
