import { getPreferenceValues } from "@raycast/api";
import dayjs from "dayjs";

const { max_num_as_unlimited } = getPreferenceValues<Preferences>();
const MAX = 999999;

export function numOrUnlimited(num: number) {
  return num === MAX && max_num_as_unlimited ? "Unlimited" : num.toString();
}

export function dayHasPassed(date: Date | null) {
  if (!date) return true;
  return dayjs(new Date()).diff(date, "h") >= 24;
}
