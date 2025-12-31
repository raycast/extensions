import type { Params, Result, CurrencyCode, RoundingMethod } from "./types";

type Language = "en" | "ja";

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
export function formatMoney(
  value: number,
  currency: CurrencyCode,
  rounding: RoundingMethod,
  language: Language = "en",
): string {
  const rounded = applyRounding(value, rounding);
  const locale = language === "ja" ? "ja-JP" : "en-US";

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

function getFreqLabel(freq: "yearly" | "monthly" | "daily", language: Language): string {
  if (language === "ja") {
    switch (freq) {
      case "yearly":
        return "年複利";
      case "monthly":
        return "月複利";
      case "daily":
        return "日複利";
    }
  } else {
    switch (freq) {
      case "yearly":
        return "Yearly";
      case "monthly":
        return "Monthly";
      case "daily":
        return "Daily";
    }
  }
}

/** Format calculation result as Markdown. */
export function toMarkdown(result: Result, params: Params, language: Language = "en"): string {
  const { fvBeforeTax, fvAfterTax, contrib, gain, tax } = result;
  const { currency, rounding, afterTax, principal, monthly, ratePct, years, freq } = params;

  const t = {
    en: {
      title: "Calculation Result",
      finalAmount: "Final Amount",
      beforeTax: "Before Tax",
      afterTax: "After Tax",
      taxAmount: "Tax Amount",
      breakdown: "Breakdown",
      totalPrincipal: "Total Principal",
      gain: "Gain",
      initialInvestment: "Initial Investment",
      totalContributions: "Total Contributions",
      conditions: "Calculation Conditions",
      principal: "Principal",
      monthly: "Monthly Contribution",
      rate: "Annual Rate",
      period: "Period",
      years: "years",
      months: (m: number) => `(${m} months)`,
      freq: "Compound Frequency",
      taxRate: "Tax Rate",
    },
    ja: {
      title: "計算結果",
      finalAmount: "最終金額",
      beforeTax: "税引前",
      afterTax: "税引後",
      taxAmount: "税額",
      breakdown: "内訳",
      totalPrincipal: "元本合計",
      gain: "利益",
      initialInvestment: "初期投資",
      totalContributions: "積立合計",
      conditions: "計算条件",
      principal: "元本",
      monthly: "毎月積立",
      rate: "年利率",
      period: "期間",
      years: "年",
      months: (m: number) => `(${m}ヶ月)`,
      freq: "複利頻度",
      taxRate: "税率",
    },
  } as const;

  const labels = t[language];
  let md = `# ${labels.title}\n\n`;

  md += `## ${labels.finalAmount}\n\n`;
  md += `**${labels.beforeTax}**: ${formatMoney(fvBeforeTax, currency, rounding, language)}\n\n`;

  if (afterTax && fvAfterTax !== undefined && tax !== undefined) {
    md += `**${labels.afterTax}**: ${formatMoney(fvAfterTax, currency, rounding, language)}\n\n`;
    md += `**${labels.taxAmount}**: ${formatMoney(tax, currency, rounding, language)}\n\n`;
  }

  md += `## ${labels.breakdown}\n\n`;
  md += `- **${labels.totalPrincipal}**: ${formatMoney(contrib, currency, rounding, language)}\n`;
  md += `- **${labels.gain}**: ${formatMoney(gain, currency, rounding, language)}\n`;

  if (principal > 0 && monthly > 0) {
    md += `  - ${labels.initialInvestment}: ${formatMoney(principal, currency, rounding, language)}\n`;
    md += `  - ${labels.totalContributions}: ${formatMoney(monthly * result.months, currency, rounding, language)}\n`;
  }

  md += `\n`;

  md += `## ${labels.conditions}\n\n`;
  md += `- **${labels.principal}**: ${formatMoney(principal, currency, rounding, language)}\n`;
  if (monthly > 0) {
    md += `- **${labels.monthly}**: ${formatMoney(monthly, currency, rounding, language)}\n`;
  }
  md += `- **${labels.rate}**: ${formatPercent(ratePct)}\n`;
  md += `- **${labels.period}**: ${years}${labels.years}`;
  if (result.months !== years * 12) {
    md += ` ${labels.months(result.months)}`;
  }
  md += `\n`;
  md += `- **${labels.freq}**: ${getFreqLabel(freq, language)}\n`;

  if (afterTax) {
    md += `- **${labels.taxRate}**: ${formatPercent(params.taxRatePct)}\n`;
  }

  return md;
}

/** Format calculation result as plain text for clipboard. */
export function toClipboardText(result: Result, params: Params, language: Language = "en"): string {
  const { fvBeforeTax, fvAfterTax, contrib, gain, tax } = result;
  const { currency, rounding, afterTax } = params;

  const labels =
    language === "ja"
      ? ({
          finalAmount: "最終金額",
          afterTax: "税引後",
          totalPrincipal: "元本合計",
          gain: "利益",
          taxAmount: "税額",
        } as const)
      : ({
          finalAmount: "Final Amount",
          afterTax: "After Tax",
          totalPrincipal: "Total Principal",
          gain: "Gain",
          taxAmount: "Tax Amount",
        } as const);

  let text = `${labels.finalAmount}: ${formatMoney(fvBeforeTax, currency, rounding, language)}`;

  if (afterTax && fvAfterTax !== undefined && tax !== undefined) {
    text += ` (${labels.afterTax}: ${formatMoney(fvAfterTax, currency, rounding, language)})`;
  }

  text += `\n${labels.totalPrincipal}: ${formatMoney(contrib, currency, rounding, language)}`;
  text += `\n${labels.gain}: ${formatMoney(gain, currency, rounding, language)}`;

  if (afterTax && tax !== undefined) {
    text += `\n${labels.taxAmount}: ${formatMoney(tax, currency, rounding, language)}`;
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
