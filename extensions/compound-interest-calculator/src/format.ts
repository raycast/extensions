import type { Params, Result, CurrencyCode, RoundingMethod } from "./types";

function applyRounding(value: number, rounding: RoundingMethod): number {
  switch (rounding) {
    case "floor":
      return Math.floor(value);
    case "round":
      return Math.round(value);
    case "ceil":
      return Math.ceil(value);
  }
}

/** Format a number as currency with locale-aware formatting. */
export function formatMoney(value: number, currency: CurrencyCode, rounding: RoundingMethod): string {
  const rounded = applyRounding(value, rounding);
  const locale = "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function getFreqLabel(freq: "yearly" | "monthly" | "daily"): string {
  switch (freq) {
    case "yearly":
      return "Yearly";
    case "monthly":
      return "Monthly";
    case "daily":
      return "Daily";
  }
}

/** Format calculation result as Markdown. */
export function toMarkdown(result: Result, params: Params): string {
  const { fvBeforeTax, fvAfterTax, contrib, gain, tax } = result;
  const { currency, rounding, afterTax, principal, monthly, ratePct, years, freq } = params;

  let md = `# Calculation Result\n\n`;

  md += `## Final Amount\n\n`;
  md += `**Before Tax**: ${formatMoney(fvBeforeTax, currency, rounding)}\n\n`;

  if (afterTax && fvAfterTax !== undefined && tax !== undefined) {
    md += `**After Tax**: ${formatMoney(fvAfterTax, currency, rounding)}\n\n`;
    md += `**Tax Amount**: ${formatMoney(tax, currency, rounding)}\n\n`;
  }

  md += `## Breakdown\n\n`;
  md += `- **Total Principal**: ${formatMoney(contrib, currency, rounding)}\n`;
  md += `- **Gain**: ${formatMoney(gain, currency, rounding)}\n`;

  if (principal > 0 && monthly > 0) {
    md += `  - Initial Investment: ${formatMoney(principal, currency, rounding)}\n`;
    md += `  - Total Contributions: ${formatMoney(monthly * result.months, currency, rounding)}\n`;
  }

  md += `\n`;

  md += `## Calculation Conditions\n\n`;
  md += `- **Principal**: ${formatMoney(principal, currency, rounding)}\n`;
  if (monthly > 0) {
    md += `- **Monthly Contribution**: ${formatMoney(monthly, currency, rounding)}\n`;
  }
  md += `- **Annual Rate**: ${formatPercent(ratePct)}\n`;
  md += `- **Period**: ${years} years`;
  if (result.months !== years * 12) {
    md += ` (${result.months} months)`;
  }
  md += `\n`;
  md += `- **Compound Frequency**: ${getFreqLabel(freq)}\n`;

  if (afterTax) {
    md += `- **Tax Rate**: ${formatPercent(params.taxRatePct)}\n`;
  }

  return md;
}

/** Format calculation result as plain text for clipboard. */
export function toClipboardText(result: Result, params: Params): string {
  const { fvBeforeTax, fvAfterTax, contrib, gain, tax } = result;
  const { currency, rounding, afterTax } = params;

  let text = `Final Amount: ${formatMoney(fvBeforeTax, currency, rounding)}`;

  if (afterTax && fvAfterTax !== undefined && tax !== undefined) {
    text += ` (After Tax: ${formatMoney(fvAfterTax, currency, rounding)})`;
  }

  text += `\nTotal Principal: ${formatMoney(contrib, currency, rounding)}`;
  text += `\nGain: ${formatMoney(gain, currency, rounding)}`;

  if (afterTax && tax !== undefined) {
    text += `\nTax Amount: ${formatMoney(tax, currency, rounding)}`;
  }

  return text;
}

/** Format calculation result as a single CSV row. */
export function toCSV(result: Result, params: Params): string {
  const { fvBeforeTax, fvAfterTax, contrib, gain, tax } = result;
  const { principal, monthly, ratePct, years, afterTax } = params;

  const values = [
    principal,
    monthly,
    ratePct,
    years,
    contrib,
    gain,
    fvBeforeTax,
    afterTax && tax !== undefined ? tax : "",
    afterTax && fvAfterTax !== undefined ? fvAfterTax : "",
  ];

  return values.map((v) => (typeof v === "number" ? v.toString() : v)).join(",");
}
