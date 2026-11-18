import { Color } from "@raycast/api";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export function fmt(n: number | undefined | null): string {
  if (n === null || n === undefined) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

export function dur(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export function bounceColor(rate: number): Color {
  if (rate <= 30) return Color.Green;
  if (rate <= 50) return Color.Yellow;
  if (rate <= 70) return Color.Orange;
  return Color.Red;
}

export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export function countryName(code: string, fallback?: string): string {
  if (!code) return fallback ?? "Unknown";
  try {
    return regionNames.of(code.toUpperCase()) ?? fallback ?? code;
  } catch {
    return fallback ?? code;
  }
}

const DOMAIN_RE = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

export function validateDomain(value: string | undefined): string | undefined {
  if (!value?.trim()) return "Domain is required";
  if (!DOMAIN_RE.test(value.trim())) return "Enter a valid domain (e.g. example.com)";
}

export function validateOptionalUrl(value: string | undefined, label: string): string | undefined {
  if (!value?.trim()) return;
  try {
    new URL(value.trim());
  } catch {
    return `Enter a valid URL for ${label}`;
  }
}
