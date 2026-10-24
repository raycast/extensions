import { gs1CheckDigit, mod, weightedSum } from "./checksum";
import { digits, int, nonZeroDigits, pick, retry } from "./random";
import { Generated, groups } from "./types";

export interface TaxIdType {
  id: string;
  iso: string;
  title: string;
  subtitle: string;
  keywords: string[];
  algorithm: string;
  generate: () => Generated;
}

/** IRS campus / internet EIN prefixes currently in use (others like 00, 07–09, 17–19 … are never issued). */
const EIN_PREFIXES = [
  ...range(1, 6),
  ...range(10, 16),
  ...range(20, 27),
  ...range(30, 48),
  ...range(50, 68),
  ...range(71, 77),
  ...range(80, 88),
  ...range(90, 95),
  98,
  99,
].map((n) => String(n).padStart(2, "0"));

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

export function ein(): Generated {
  const prefix = pick(EIN_PREFIXES);
  const serial = digits(7);
  return {
    compact: prefix + serial,
    formatted: `${prefix}-${serial}`,
    fields: [
      { label: "Campus prefix", value: prefix },
      { label: "Serial", value: serial },
    ],
  };
}

/** ABN for a 9-digit body (an ACN for companies, a random number otherwise). */
export function abnFromBody(body: string): Generated {
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  // The two leading check digits make the weighted sum (after subtracting 1 from the first digit) divisible by 89.
  // Prefix range is 11..99 (x = 1..89), as issued by the ATO.
  const x = mod(-weightedSum("00" + body, weights), 89) || 89;
  const value = `${Math.floor(x / 10) + 1}${x % 10}${body}`;
  return {
    compact: value,
    formatted: groups(value, [2, 3, 3, 3]),
    fields: [
      { label: "Check digits", value: value.slice(0, 2) },
      { label: "Body", value: body },
    ],
  };
}

export function abn(): Generated {
  return abnFromBody(nonZeroDigits(9));
}

export function acn(): Generated {
  const base = digits(8);
  const value = base + mod(-weightedSum(base, [8, 7, 6, 5, 4, 3, 2, 1]), 10);
  return { compact: value, formatted: groups(value, [3, 3, 3]) };
}

export function tfn(): Generated {
  return retry(() => {
    const base = nonZeroDigits(8);
    const check = weightedSum(base, [1, 4, 3, 7, 5, 8, 6, 9]) % 11;
    if (check === 10) return undefined;
    const value = base + check;
    return { compact: value, formatted: groups(value, [3, 3, 3]) };
  });
}

export function ird(): Generated {
  return retry(() => {
    const base = String(int(1_000_001, 14_999_999));
    const padded = base.padStart(8, "0");
    let check = mod(-weightedSum(padded, [3, 2, 7, 6, 5, 4, 3, 2]), 11);
    if (check === 10) check = mod(-weightedSum(padded, [7, 4, 3, 2, 5, 2, 7, 6]), 11);
    if (check === 10) return undefined;
    const value = base + check;
    return { compact: value, formatted: groups(value.padStart(9, "0"), [3, 3, 3], "-") };
  });
}

export function nzbn(): Generated {
  const base = "94290" + digits(7);
  const value = base + gs1CheckDigit(base);
  return { compact: value, formatted: value };
}

export const TAX_ID_TYPES: TaxIdType[] = [
  {
    id: "us-ein",
    iso: "US",
    title: "EIN",
    subtitle: "US Employer Identification Number",
    keywords: ["us", "usa", "america", "united states", "ein", "fein", "tin", "irs"],
    algorithm: "9 digits, valid IRS campus prefix (no checksum)",
    generate: ein,
  },
  {
    id: "au-abn",
    iso: "AU",
    title: "ABN",
    subtitle: "Australian Business Number",
    keywords: ["australia", "abn", "gst", "business"],
    algorithm: "11 digits, weighted mod 89",
    generate: abn,
  },
  {
    id: "au-acn",
    iso: "AU",
    title: "ACN",
    subtitle: "Australian Company Number",
    keywords: ["australia", "acn", "company", "asic"],
    algorithm: "9 digits, weighted mod 10",
    generate: acn,
  },
  {
    id: "au-tfn",
    iso: "AU",
    title: "TFN",
    subtitle: "Australian Tax File Number",
    keywords: ["australia", "tfn", "tax file"],
    algorithm: "9 digits, weighted mod 11",
    generate: tfn,
  },
  {
    id: "nz-ird",
    iso: "NZ",
    title: "IRD / GST Number",
    subtitle: "New Zealand Inland Revenue number (also used as GST number)",
    keywords: ["new zealand", "nz", "ird", "gst", "inland revenue"],
    algorithm: "8–9 digits, weighted mod 11 (primary + secondary weights)",
    generate: ird,
  },
  {
    id: "nz-nzbn",
    iso: "NZ",
    title: "NZBN",
    subtitle: "New Zealand Business Number",
    keywords: ["new zealand", "nz", "nzbn", "business"],
    algorithm: "13 digits (GS1 GTIN-13, prefix 9429)",
    generate: nzbn,
  },
];
