import { getPreferenceValues } from "@raycast/api";
import dayjs from "dayjs";

const { max_num_as_unlimited } = getPreferenceValues<Preferences>();

function isMax(num: number) {
  const MAX = 999999;
  const MAX_SERVER_BW = 99999;
  return num === MAX || num === MAX_SERVER_BW;
}
export function numOrUnlimited(num: number, maxText = "Unlimited") {
  return isMax(num) && max_num_as_unlimited ? maxText : num.toString();
}

export function dayHasPassed(date: Date | null) {
  if (!date) return true;
  return dayjs(new Date()).diff(date, "h") >= 24;
}

export function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
