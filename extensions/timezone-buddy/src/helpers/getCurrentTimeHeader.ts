import { getCurrentTimeForTz } from "./getCurrentTimeForTz";
import { getOffsetHrsDisplay } from "./getOffsetHrsDisplay";
export function getCurrentTimeHeader(currentTimeOffsetHrs: number): string {
  const localTime = getCurrentTimeForTz(Intl.DateTimeFormat().resolvedOptions().timeZone, currentTimeOffsetHrs);
  return `${currentTimeOffsetHrs ? "Local" : "Current"} Time: ${localTime} ${currentTimeOffsetHrs ? `(${getOffsetHrsDisplay(currentTimeOffsetHrs)})` : ""}`;
}
