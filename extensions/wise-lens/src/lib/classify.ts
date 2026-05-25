import { Direction, ParsedAmount, WiseActivity } from "./types";

export function stripHtml(s: string | undefined | null): string {
  return (s ?? "").replace(/<[^>]+>/g, "");
}

export function parseAmount(str: string | undefined | null): ParsedAmount | null {
  if (!str || typeof str !== "string") return null;
  const m = str.trim().match(/^(-?[\d.,]+)\s+([A-Z]{3})$/);
  if (!m) return null;
  const num = parseFloat(m[1].replace(/,/g, ""));
  if (Number.isNaN(num)) return null;
  return { value: num, currency: m[2] };
}

export function classifyDirection(act: WiseActivity): Direction {
  const desc = (act.description ?? "").toLowerCase();
  if (desc.includes("refund")) return "in";
  if (act.type === "CARD_PAYMENT") return "out";
  if (act.type === "TRANSFER") {
    if (desc.includes("received") || desc.includes("top up") || desc.includes("topped up")) return "in";
    return "out";
  }
  return "neutral";
}

export function outflowInCurrency(act: WiseActivity, displayCurrency: string): number {
  if (classifyDirection(act) !== "out") return 0;
  const primary = parseAmount(act.primaryAmount);
  const secondary = parseAmount(act.secondaryAmount);
  if (primary && primary.currency === displayCurrency) return Math.abs(primary.value);
  if (secondary && secondary.currency === displayCurrency) return Math.abs(secondary.value);
  return 0;
}

export function displayAmount(act: WiseActivity, displayCurrency: string): ParsedAmount | null {
  const primary = parseAmount(act.primaryAmount);
  const secondary = parseAmount(act.secondaryAmount);
  if (primary && primary.currency === displayCurrency) return primary;
  if (secondary && secondary.currency === displayCurrency) return secondary;
  return primary ?? secondary;
}
