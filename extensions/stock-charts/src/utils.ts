import { Color, Icon } from "@raycast/api";

const SUFFIXES: [number, string][] = [
  [1e12, "T"],
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "k"],
];

const SUBUNIT_CURRENCIES: Record<string, { code: string; divisor: number }> = {
  GBp: { code: "GBP", divisor: 100 },
  ILA: { code: "ILS", divisor: 100 },
  ZAc: { code: "ZAR", divisor: 100 },
};

export function normalizeCurrency(currency: string): string {
  return SUBUNIT_CURRENCIES[currency]?.code ?? currency;
}

function normalizeValue(value: number, currency: string): number {
  const sub = SUBUNIT_CURRENCIES[currency];
  return sub ? value / sub.divisor : value;
}

export function formatMoney(value?: number | null, currency = "USD"): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";

  const cur = normalizeCurrency(currency);
  const val = normalizeValue(value, currency);
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);

  for (const [threshold, suffix] of SUFFIXES) {
    if (Math.abs(val) >= threshold) {
      return `${fmt(val / threshold)}${suffix} ${cur}`;
    }
  }

  return `${fmt(val)} ${cur}`;
}

export function formatChange(
  change?: number,
  changePercent?: number,
  currency = "USD",
): string {
  if (change === undefined || changePercent === undefined) return "—";
  if (Number.isNaN(change) || Number.isNaN(changePercent)) return "—";

  const sign = change >= 0 ? "+" : "";
  const cur = normalizeCurrency(currency);
  const absChange = Math.abs(normalizeValue(change, currency));
  const fmtAbs = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absChange);
  const fmtChange = `${sign}${change < 0 ? "-" : ""}${fmtAbs} ${cur}`;
  const fmtPercent = `${sign}${changePercent.toFixed(2)}%`;
  return `${fmtChange} (${fmtPercent})`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function formatPercent(changePercent?: number): string {
  if (changePercent === undefined || Number.isNaN(changePercent)) return "—";
  const sign = changePercent >= 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}

export function changeIcon(change?: number): {
  source: Icon;
  tintColor: Color;
} {
  if (change !== undefined && change > 0) {
    return { source: Icon.ArrowUp, tintColor: Color.Green };
  }
  if (change !== undefined && change < 0) {
    return { source: Icon.ArrowDown, tintColor: Color.Red };
  }
  return { source: Icon.Dot, tintColor: Color.PrimaryText };
}

export function changeColor(change?: number): Color {
  if (change !== undefined && change > 0) return Color.Green;
  if (change !== undefined && change < 0) return Color.Red;
  return Color.PrimaryText;
}

export function formatEarningsDate(timestamp?: number): string {
  if (!timestamp) return "—";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function generateIcs(
  symbol: string,
  companyName: string,
  timestamp: number,
): string {
  const date = new Date(timestamp * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const toIcal = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const dtStart = toIcal(date);
  const dtstamp = toIcal(new Date());
  const uid = `${symbol}-earnings-${timestamp}@raycast-stock-charts`;
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Raycast Stock Charts//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtStart}`,
      `SUMMARY:${symbol} Earnings Call`,
      `DESCRIPTION:Earnings announcement for ${companyName}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n") + "\r\n"
  );
}

export function stockLogoUrl(symbol: string): string {
  const clean = symbol.replace(/[^A-Za-z0-9.-]/g, "").toUpperCase();
  return `https://companiesmarketcap.com/img/company-logos/64/${clean}.webp`;
}
