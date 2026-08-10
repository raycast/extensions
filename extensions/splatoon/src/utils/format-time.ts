import { getPreferenceValues } from "@raycast/api";
import { formatDistance, intlFormat } from "date-fns";

export function formatTime(date: Date | number) {
  const { clock24 } = getPreferenceValues<ExtensionPreferences>();

  return intlFormat(date, {
    hour: "numeric",
    minute: "numeric",
    hour12: !clock24,
  });
}

export function formatTimeRange(from: Date | number, to: Date | number) {
  return `${formatTime(from)} — ${formatTime(to)}`;
}

export function formatRelativeTime(date: Date | number) {
  return formatDistance(Date.now(), date);
}
