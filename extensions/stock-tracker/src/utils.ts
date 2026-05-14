import { Color, Icon } from "@raycast/api";

const MAGNITUDE_SUFFIXES = ["", "k", "M", "B", "T"];

export function formatMoney(value?: number, currency?: string) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }

  const magnitude = Math.min(Math.floor(Math.log10(Math.max(Math.abs(value), 1)) / 3), MAGNITUDE_SUFFIXES.length - 1);
  const suffix = MAGNITUDE_SUFFIXES[magnitude];
  const scaledValue = value / Math.pow(10, magnitude * 3);
  let strValue = scaledValue.toFixed(2);
  if (currency) {
    strValue = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(scaledValue);
  }
  return strValue + suffix;
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

export function changeIcon(change?: number) {
  return {
    source: change ? (change > 0 ? Icon.ArrowUp : Icon.ArrowDown) : Icon.Dot,
    tintColor: change ? (change > 0 ? Color.Green : Color.Red) : Color.PrimaryText,
  };
}
