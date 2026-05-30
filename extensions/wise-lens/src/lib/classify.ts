import { Direction, ParsedAmount, WiseActivity } from "./types";

export function stripHtml(s: string | undefined | null): string {
  return (s ?? "").replace(/<[^>]+>/g, "");
}

export function parseAmount(str: string | undefined | null): ParsedAmount | null {
  if (!str || typeof str !== "string") return null;
  // Wise wraps amounts in <positive>/<negative> tags with a leading +/- sign.
  // Strip the markup and the sign, returning the magnitude (direction comes from
  // classifyDirection).
  const clean = stripHtml(str).trim();
  const m = clean.match(/^[+-]?\s*([\d.,]+)\s+([A-Z]{3})$/);
  if (!m) return null;
  const num = parseFloat(m[1].replace(/,/g, ""));
  if (Number.isNaN(num)) return null;
  return { value: num, currency: m[2] };
}

export function classifyDirection(act: WiseActivity): Direction {
  // Wise encodes the direction in primaryAmount via a <positive>/<negative> tag
  // (or a leading +/- sign). That signal is authoritative — prefer it over the
  // type/description heuristics, which misclassify e.g. an incoming transfer whose
  // description doesn't happen to say "received".
  const raw = act.primaryAmount ?? "";
  if (/<positive>/i.test(raw)) return "in";
  if (/<negative>/i.test(raw)) return "out";
  const stripped = stripHtml(raw).trim();
  if (stripped.startsWith("+")) return "in";
  if (stripped.startsWith("-")) return "out";

  // Fallback when Wise gives no sign (e.g. legacy/unsigned data).
  const desc = (act.description ?? "").toLowerCase();
  if (desc.includes("refund")) return "in";
  if (act.type === "CARD_PAYMENT") return "out";
  if (act.type === "TRANSFER") {
    if (desc.includes("received") || desc.includes("top up") || desc.includes("topped up")) return "in";
    return "out";
  }
  return "neutral";
}

export function outflowAmount(act: WiseActivity): ParsedAmount | null {
  if (classifyDirection(act) !== "out") return null;
  const primary = parseAmount(act.primaryAmount);
  if (primary) return { value: Math.abs(primary.value), currency: primary.currency };
  const secondary = parseAmount(act.secondaryAmount);
  if (secondary) return { value: Math.abs(secondary.value), currency: secondary.currency };
  return null;
}

export function displayAmount(act: WiseActivity, displayCurrency: string): ParsedAmount | null {
  const primary = parseAmount(act.primaryAmount);
  const secondary = parseAmount(act.secondaryAmount);
  if (primary && primary.currency === displayCurrency) return primary;
  if (secondary && secondary.currency === displayCurrency) return secondary;
  return primary ?? secondary;
}
