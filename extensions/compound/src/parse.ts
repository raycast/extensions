import type { Params, CompoundFrequency, CurrencyCode, RoundingMethod, Preferences } from "./types";

type Language = "en" | "ja";

const errorMessages = {
  en: {
    rateAndYearsRequired: "Rate and years are required",
    rateOutOfRange: "Rate must be between -100% and 1000%",
    yearsOutOfRange: "Years must be greater than 0 and less than or equal to 100",
    negativeValues: "Principal and monthly contributions must be 0 or greater",
  },
  ja: {
    rateAndYearsRequired: "利率と期間は必須です",
    rateOutOfRange: "利率は -100% から 1000% の範囲で指定してください",
    yearsOutOfRange: "期間は 0 より大きく 100 年以下で指定してください",
    negativeValues: "元本と積立額は 0 以上で指定してください",
  },
} as const;

/**
 * Normalize number string by removing formatting characters and converting units.
 * Supports: commas, currency symbols ($, ¥, €, £, ₹), Japanese units (万, 円), and millions (m).
 */
function normalizeNumber(str: string): number {
  let normalized = str.replace(/,/g, "");
  normalized = normalized.replace(/%/g, "");
  normalized = normalized.replace(/[$¥€£₹]/g, "");
  normalized = normalized.replace(/円/g, "");

  if (normalized.includes("万")) {
    const num = parseFloat(normalized.replace("万", ""));
    return num * 10000;
  }

  if (normalized.toLowerCase().endsWith("m")) {
    const num = parseFloat(normalized.slice(0, -1));
    return num * 1000000;
  }

  return parseFloat(normalized);
}

/**
 * Parse quick input string into calculation parameters.
 *
 * Positional patterns (space-separated):
 * - rate years: "5% 10y"
 * - principal rate years: "$10,000 5% 10y"
 * - principal rate years monthly: "$10,000 5% 10y $500"
 * - principal rate years monthly tax: "$10,000 5% 10y $500 20%"
 *
 * Key-value pattern: "p=10000 r=5 y=10 m=500 tax=20"
 *
 * Supported formats:
 * - Period: 10y, 10years, 10年, 6m, 6months, 6ヶ月
 * - Money: 10000, 100,000, $100, ¥1,000, 10万円
 */
export function parseQuickInput(query: string, preferences: Preferences, language: Language = "en"): Params {
  const errors = errorMessages[language];
  const params: Partial<Params> = {
    principal: 0,
    monthly: 0,
    ratePct: 0,
    years: 0,
    freq: preferences.defaultCompoundFreq,
    afterTax: false,
    taxRatePct: preferences.defaultTaxRate ? parseFloat(preferences.defaultTaxRate) : 0,
    currency: preferences.defaultCurrency,
    rounding: preferences.defaultRounding,
  };

  const tokens = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  const positionalArgs: number[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();

    if (lower === "tax") {
      params.afterTax = true;
      continue;
    }

    if (token.includes("=")) {
      const [key, value] = token.split("=");
      const keyLower = key.toLowerCase();
      const numValue = normalizeNumber(value);

      switch (keyLower) {
        case "p":
        case "principal":
          params.principal = numValue;
          break;
        case "m":
        case "monthly":
          params.monthly = numValue;
          break;
        case "r":
        case "rate":
          params.ratePct = numValue;
          break;
        case "y":
        case "years":
          params.years = numValue;
          break;
        case "freq":
          params.freq = value as CompoundFrequency;
          break;
        case "tax":
        case "taxrate":
          params.taxRatePct = numValue;
          break;
        case "currency":
          params.currency = value.toUpperCase() as CurrencyCode;
          break;
        case "rounding":
          params.rounding = value as RoundingMethod;
          break;
      }
      continue;
    }

    const yearMatch = token.match(/^(\d+(?:\.\d+)?)(y|years?|年)$/i);
    const monthMatch = token.match(/^(\d+(?:\.\d+)?)(m|months?|ヶ月|ヵ月|ケ月|カ月)$/i);

    if (yearMatch) {
      params.years = parseFloat(yearMatch[1]);
      continue;
    }

    if (monthMatch) {
      params.years = parseFloat(monthMatch[1]) / 12;
      continue;
    }

    if (/^[$¥€£₹]?[\d,.万円%m]+$/i.test(token)) {
      positionalArgs.push(normalizeNumber(token));
    }
  }

  const hasYears = params.years && params.years > 0;

  if (hasYears) {
    if (positionalArgs.length >= 4) {
      params.principal = positionalArgs[0];
      params.ratePct = positionalArgs[1];
      params.monthly = positionalArgs[2];
      params.taxRatePct = positionalArgs[3];
      params.afterTax = true;
    } else if (positionalArgs.length === 3) {
      params.principal = positionalArgs[0];
      params.ratePct = positionalArgs[1];
      params.monthly = positionalArgs[2];
    } else if (positionalArgs.length === 2) {
      params.principal = positionalArgs[0];
      params.ratePct = positionalArgs[1];
    } else if (positionalArgs.length === 1) {
      // 期間が設定済みで引数が1つなら、利率として解釈
      params.ratePct = positionalArgs[0];
    }
  } else {
    if (positionalArgs.length >= 5) {
      params.principal = positionalArgs[0];
      params.ratePct = positionalArgs[1];
      params.years = positionalArgs[2];
      params.monthly = positionalArgs[3];
      params.taxRatePct = positionalArgs[4];
      params.afterTax = true;
    } else if (positionalArgs.length === 4) {
      params.principal = positionalArgs[0];
      params.ratePct = positionalArgs[1];
      params.years = positionalArgs[2];
      params.monthly = positionalArgs[3];
    } else if (positionalArgs.length === 3) {
      params.principal = positionalArgs[0];
      params.ratePct = positionalArgs[1];
      params.years = positionalArgs[2];
    } else if (positionalArgs.length === 2) {
      params.ratePct = positionalArgs[0];
      params.years = positionalArgs[1];
    }
  }

  if (!params.ratePct || !params.years) {
    throw new Error(errors.rateAndYearsRequired);
  }

  if (params.ratePct <= -100 || params.ratePct >= 1000) {
    throw new Error(errors.rateOutOfRange);
  }

  if (params.years <= 0 || params.years > 100) {
    throw new Error(errors.yearsOutOfRange);
  }

  if (params.principal! < 0 || params.monthly! < 0) {
    throw new Error(errors.negativeValues);
  }

  return params as Params;
}

/**
 * Parse form input values into calculation parameters.
 */
export function parseFormInput(
  values: {
    principal: string;
    rate: string;
    years: string;
    monthly: string;
    freq: CompoundFrequency;
    afterTax: boolean;
    taxRate: string;
    currency: CurrencyCode;
    rounding: RoundingMethod;
  },
  language: Language = "en",
): Params {
  const errors = errorMessages[language];
  const principal = normalizeNumber(values.principal || "0");
  const monthly = normalizeNumber(values.monthly || "0");
  const ratePct = normalizeNumber(values.rate);
  const years = normalizeNumber(values.years);
  const taxRatePct = normalizeNumber(values.taxRate);

  if (!ratePct || !years) {
    throw new Error(errors.rateAndYearsRequired);
  }

  if (ratePct <= -100 || ratePct >= 1000) {
    throw new Error(errors.rateOutOfRange);
  }

  if (years <= 0 || years > 100) {
    throw new Error(errors.yearsOutOfRange);
  }

  if (principal < 0 || monthly < 0) {
    throw new Error(errors.negativeValues);
  }

  return {
    principal,
    monthly,
    ratePct,
    years,
    freq: values.freq,
    afterTax: values.afterTax,
    taxRatePct,
    currency: values.currency,
    rounding: values.rounding,
  };
}
