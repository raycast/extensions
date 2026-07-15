import { getHourForTz } from "./getHourForTz";

export function getTooltipForTz(tz: string, offsetHrs?: number) {
  const hour = getHourForTz(tz, offsetHrs);

  if (hour >= 5 && hour <= 7) {
    return "It's early, they might be sleeping";
  }

  if (hour >= 8 && hour < 9) {
    return "It's early, they might be busy";
  }

  if (hour >= 9 && hour <= 18) {
    return "It's a good time to reach out";
  }

  if (hour >= 19 && hour < 23) {
    return "It's getting late, they might be busy";
  }

  return "It's late, they might be sleeping";
}
