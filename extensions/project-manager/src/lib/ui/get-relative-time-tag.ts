import { getRelativeTime } from "../get-relative-time";

export function getRelativeTimeTag(date: Date) {
  return { tag: { value: getRelativeTime(date) } };
}
