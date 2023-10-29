import { Color, Icon } from "@raycast/api";

export function formatMoney(value?: number, currency?: string) {
  if (!value) {
    return "—";
  }

  const magnitude = Math.floor(Math.log10(Math.max(value, 1)) / 3);
  const suffices = ["", "k", "M", "B", "T"];
  const suffix = suffices[magnitude];
  const scaledValue = value / Math.pow(10, magnitude * 3);
  let strValue = scaledValue.toFixed(2);
  if (currency) {
    strValue = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(scaledValue);
  }
  return strValue + suffix;
}

export function changeIcon(change?: number) {
  return {
    source: change ? (change > 0 ? Icon.ArrowUp : Icon.ArrowDown) : Icon.Dot,
    tintColor: change ? (change > 0 ? Color.Green : Color.Red) : Color.PrimaryText,
  };
}
