import { Color, Icon } from "@raycast/api";

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyPrecise(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function gainColor(value: number): Color {
  if (value > 0) return Color.Green;
  if (value < 0) return Color.Red;
  return Color.SecondaryText;
}

export function signalIcon(type?: string): Icon {
  switch ((type ?? "").toLowerCase()) {
    case "earnings":
      return Icon.BarChart;
    case "dividend":
      return Icon.BankNote;
    case "analyst":
      return Icon.Person;
    case "macro":
      return Icon.Globe;
    case "technical":
      return Icon.LineChart;
    case "risk":
    case "warning":
      return Icon.ExclamationMark;
    case "opportunity":
      return Icon.Star;
    default:
      return Icon.Dot;
  }
}
