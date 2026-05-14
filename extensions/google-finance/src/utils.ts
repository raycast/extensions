import { Color, Icon, Image } from "@raycast/api";

export function formatMoney(value: number, currency: string): string {
  const absValue = Math.abs(value);
  let formatted: string;

  if (absValue >= 1_000_000_000_000) {
    formatted = (value / 1_000_000_000_000).toFixed(2) + "T";
  } else if (absValue >= 1_000_000_000) {
    formatted = (value / 1_000_000_000).toFixed(2) + "B";
  } else if (absValue >= 1_000_000) {
    formatted = (value / 1_000_000).toFixed(2) + "M";
  } else if (absValue >= 1_000) {
    formatted = (value / 1_000).toFixed(2) + "k";
  } else {
    formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return formatted;
  }

  const symbol = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(0)
    .replace("0", "");

  return `${symbol}${formatted}`;
}

export function changeIcon(change: number): Image.ImageLike {
  if (change > 0) {
    return { source: Icon.ArrowUp, tintColor: Color.Green };
  } else if (change < 0) {
    return { source: Icon.ArrowDown, tintColor: Color.Red };
  }
  return { source: Icon.Dot, tintColor: Color.SecondaryText };
}

export function changeColor(change: number): Color {
  if (change > 0) return Color.Green;
  if (change < 0) return Color.Red;
  return Color.PrimaryText;
}
