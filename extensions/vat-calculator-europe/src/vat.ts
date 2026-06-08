import vatData from "../vat.json";

interface RateGroup {
  name: string;
  rates: number[];
}

export interface Country {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  /** BCP-47 locale used to format amounts (thousands + decimal separator). */
  locale: string;
  rates: RateGroup[];
}

const countries = vatData.countries as Country[];

/** All countries that have VAT data available. */
export function getCountries(): Country[] {
  return countries;
}

export function findCountry(code: string): Country | undefined {
  return countries.find((country) => country.code === code);
}

/**
 * Returns true if splitting on a single separator type yields a valid
 * thousands grouping: a 1–3 digit lead followed by groups of exactly 3 digits
 * (e.g. "1.234", "12.345", "1.234.567"). The leading minus is ignored.
 */
function isThousandsGrouping(parts: string[]): boolean {
  if (parts.length < 2) {
    return false;
  }
  const [first, ...rest] = parts;
  const lead = first.replace("-", "");
  if (lead.length < 1 || lead.length > 3) {
    return false;
  }
  return rest.every((group) => group.length === 3);
}

/**
 * Parses an amount that may use either comma or dot as decimal/thousands
 * separator, without knowing the locale:
 *
 *  - Both "," and "." present → the last one is the decimal separator, the
 *    others are thousands separators ("1.234,56" and "1,234.56" → 1234.56).
 *  - One separator type, appearing as a valid thousands grouping → integer
 *    ("1.234" → 1234, "1.234.567" → 1234567).
 *  - One separator otherwise → decimal separator ("9.99" → 9.99, "9,5" → 9.5).
 *
 * The single ambiguous case (one separator, exactly 3 trailing digits, e.g.
 * "9.999") is resolved as a thousands grouping → 9999.
 *
 * Returns null for empty or non-numeric input.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, "");
  if (cleaned === "" || !/^-?[\d.,]+$/.test(cleaned)) {
    return null;
  }

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized: string;
  if (hasComma && hasDot) {
    const decimalPos = Math.max(
      cleaned.lastIndexOf(","),
      cleaned.lastIndexOf("."),
    );
    const intPart = cleaned.slice(0, decimalPos).replace(/[.,]/g, "");
    const fracPart = cleaned.slice(decimalPos + 1);
    normalized = `${intPart}.${fracPart}`;
  } else if (hasComma || hasDot) {
    const separator = hasComma ? "," : ".";
    const parts = cleaned.split(separator);
    normalized = isThousandsGrouping(parts)
      ? parts.join("")
      : cleaned.replace(separator, ".");
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Locale-aware number, e.g. "de-DE" → "123.456,67". No currency symbol. */
function formatNumber(amount: number, country: Country): string {
  return new Intl.NumberFormat(country.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export interface VatLine {
  label: string;
  /** Displayed amount incl. currency symbol, e.g. "123.456,67 €". */
  formatted: string;
  /** Locale-formatted number without symbol, used for copy-to-clipboard. */
  copyValue: string;
}

function buildLine(label: string, amount: number, country: Country): VatLine {
  const number = formatNumber(amount, country);
  return {
    label,
    formatted: `${number} ${country.currencySymbol}`,
    copyValue: number,
  };
}

export interface VatSection {
  /** Heading shown above the group, e.g. "If net → gross". */
  title: string;
  lines: VatLine[];
}

/**
 * The entered amount is ambiguous — it could be a net or a gross price. We
 * therefore compute both interpretations and return them as two groups:
 *
 *  - "If net → gross": treat the input as net and add VAT for every rate.
 *  - "If gross → net": treat the input as gross and remove VAT for every rate.
 */
export function calculateVat(amount: number, country: Country): VatSection[] {
  const ifNet: VatLine[] = [];
  const ifGross: VatLine[] = [];

  for (const group of country.rates) {
    for (const rate of group.rates) {
      const factor = 1 + rate / 100;
      const label = `${group.name} (${rate}%)`;
      ifNet.push(buildLine(label, amount * factor, country));
      ifGross.push(buildLine(label, amount / factor, country));
    }
  }

  return [
    { title: "If net → gross", lines: ifNet },
    { title: "If gross → net", lines: ifGross },
  ];
}
