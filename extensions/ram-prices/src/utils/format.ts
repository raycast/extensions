import { Color, Icon } from "@raycast/api";

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatUsdPerGb(value: number) {
  return `${formatUsd(value)}/GB`;
}

export function formatPercent(value?: number) {
  if (value === undefined) {
    return "-";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatShortDate(date?: string) {
  if (!date) {
    return "-";
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getTrendAccessory(value?: number): { icon: { source: Icon; tintColor?: Color }; text: string } {
  if (value === undefined) {
    return {
      icon: { source: Icon.Minus },
      text: formatPercent(value),
    };
  }

  if (value > 0) {
    return {
      icon: { source: Icon.ArrowUp, tintColor: Color.Red },
      text: formatPercent(value),
    };
  }

  if (value < 0) {
    return {
      icon: { source: Icon.ArrowDown, tintColor: Color.Green },
      text: formatPercent(value),
    };
  }

  return {
    icon: { source: Icon.Minus },
    text: formatPercent(value),
  };
}
