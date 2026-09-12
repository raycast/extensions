import type { SignedColor } from "./types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function finiteNumber(value: number | string | null | undefined): number | null {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function signed(value: number, text: string): string {
  return value > 0 ? `+${text}` : text;
}

export function formatPrice(value: number | string | null | undefined): string {
  const numberValue = finiteNumber(value);
  if (numberValue === null) {
    return "—";
  }

  const abs = Math.abs(numberValue);
  if (abs >= 1) {
    return currencyFormatter.format(numberValue);
  }

  const maximumFractionDigits = abs >= 0.01 ? 4 : 8;
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(numberValue)}`;
}

export function formatUsd(value: number | string | null | undefined): string {
  const numberValue = finiteNumber(value);
  return numberValue === null ? "—" : currencyFormatter.format(numberValue);
}

export function formatCompactUsd(value: number | string | null | undefined): string {
  const numberValue = finiteNumber(value);
  if (numberValue === null) {
    return "—";
  }

  const abs = Math.abs(numberValue);
  const sign = numberValue < 0 ? "-" : "";
  const units = [
    { suffix: "B", value: 1_000_000_000 },
    { suffix: "M", value: 1_000_000 },
    { suffix: "K", value: 1_000 },
  ];
  const unit = units.find((candidate) => abs >= candidate.value);
  if (!unit) {
    return `${sign}$${abs.toFixed(2)}`;
  }

  return `${sign}$${(abs / unit.value).toFixed(2)}${unit.suffix}`;
}

export function formatPercentChange(value: number | string | null | undefined): string {
  const numberValue = finiteNumber(value);
  if (numberValue === null) {
    return "—";
  }

  const percent = numberValue * 100;
  return signed(percent, `${percent.toFixed(2)}%`);
}

export function formatFundingRate(value: number | string | null | undefined): string {
  const numberValue = finiteNumber(value);
  if (numberValue === null) {
    return "—";
  }

  const percent = numberValue * 100;
  return signed(percent, `${percent.toFixed(4)}%`);
}

export function getSignedColor(value: number | string | null | undefined): SignedColor {
  const numberValue = finiteNumber(value);
  if (numberValue === null || numberValue === 0) {
    return "secondary";
  }

  return numberValue > 0 ? "green" : "red";
}

export function parseNumber(value: number | string | null | undefined, fallback = 0): number {
  return finiteNumber(value) ?? fallback;
}
