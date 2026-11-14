import { luhnCheckDigit, luhnChecksum, mod, mod11_10, weightedSum } from "./checksum";
import { digits, int, nonZeroDigits, pick, retry } from "./random";
import { Field, Generated, groups } from "./types";

export interface VatCountry {
  /** VAT prefix (EL for Greece, XI for Northern Ireland). */
  prefix: string;
  /** ISO country code, used for the flag. */
  iso: string;
  name: string;
  localName: string;
  keywords: string[];
  algorithm: string;
  /** Returns the national part (without the prefix). */
  generate: () => string;
  /** Full human formatting (prefix included). Defaults to "XX 123456789". */
  format?: (national: string) => string;
  /** Some countries wrap the number differently (CHE-…-MWST, NO…MVA). */
  compact?: (national: string) => string;
  /** Extra copyable representations, e.g. the domestic company number. */
  variants?: (national: string) => Field[];
}

const W = (...weights: number[]) => weights;

const vatCountries: VatCountry[] = [
  {
    prefix: "AT",
    iso: "AT",
    name: "Austria",
    localName: "UID-Nummer",
    keywords: ["austria", "österreich", "uid"],
    algorithm: "U + 8 digits, Luhn-derived check digit",
    generate: () => {
      const base = digits(7);
      return "U" + base + mod(6 - luhnChecksum(base), 10);
    },
    format: (n) => `AT${n}`,
  },
  {
    prefix: "BE",
    iso: "BE",
    name: "Belgium",
    localName: "BTW / TVA (ondernemingsnummer)",
    keywords: ["belgium", "belgië", "belgique", "btw", "tva", "kbo", "ondernemingsnummer", "enterprise"],
    algorithm: "10 digits, last 2 = 97 − (first 8 mod 97)",
    generate: () => {
      const base = pick(["0", "0", "0", "1"]) + nonZeroDigits(7);
      return base + String(97 - (Number(base) % 97)).padStart(2, "0");
    },
    format: (n) => `BE ${n.slice(0, 4)}.${n.slice(4, 7)}.${n.slice(7)}`,
  },
  {
    prefix: "BG",
    iso: "BG",
    name: "Bulgaria",
    localName: "ДДС номер (EIK)",
    keywords: ["bulgaria", "eik", "bulstat"],
    algorithm: "9 digits, weighted mod 11",
    generate: () => {
      const base = nonZeroDigits(8);
      let check = weightedSum(base, W(1, 2, 3, 4, 5, 6, 7, 8)) % 11;
      if (check === 10) check = weightedSum(base, W(3, 4, 5, 6, 7, 8, 9, 10)) % 11;
      return base + (check % 10);
    },
  },
  {
    prefix: "CY",
    iso: "CY",
    name: "Cyprus",
    localName: "ΦΠΑ",
    keywords: ["cyprus"],
    algorithm: "8 digits + check letter",
    generate: () => {
      const base = "10" + digits(6);
      const odd: Record<string, number> = { 0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21 };
      let sum = 0;
      for (let i = 0; i < 8; i++) sum += i % 2 === 0 ? odd[base[i]] : Number(base[i]);
      return base + String.fromCharCode(65 + (sum % 26));
    },
  },
  {
    prefix: "CZ",
    iso: "CZ",
    name: "Czechia",
    localName: "DIČ",
    keywords: ["czech", "czechia", "dic", "dič", "ico"],
    algorithm: "8 digits (IČO), weighted mod 11",
    generate: () => {
      const base = String(int(2, 8)) + digits(6);
      const check = mod(11 - weightedSum(base, W(8, 7, 6, 5, 4, 3, 2)), 11);
      return base + ((check || 1) % 10);
    },
  },
  {
    prefix: "DE",
    iso: "DE",
    name: "Germany",
    localName: "USt-IdNr.",
    keywords: ["germany", "deutschland", "ust", "ust-idnr", "umsatzsteuer"],
    algorithm: "9 digits, ISO 7064 MOD 11-10",
    generate: () => {
      const base = nonZeroDigits(8);
      return base + mod11_10(base);
    },
  },
  {
    prefix: "DK",
    iso: "DK",
    name: "Denmark",
    localName: "CVR / SE-nummer",
    keywords: ["denmark", "danmark", "cvr", "moms"],
    algorithm: "8 digits, weighted sum mod 11 = 0",
    generate: () =>
      retry(() => {
        const base = nonZeroDigits(7);
        const check = mod(-weightedSum(base, W(2, 7, 6, 5, 4, 3, 2)), 11);
        return check === 10 ? undefined : base + check;
      }),
    format: (n) => `DK ${groups(n, [2, 2, 2, 2])}`,
  },
  {
    prefix: "EE",
    iso: "EE",
    name: "Estonia",
    localName: "KMKR",
    keywords: ["estonia", "eesti", "kmkr"],
    algorithm: "9 digits starting 10, weighted mod 10",
    generate: () => {
      const base = "10" + digits(6);
      return base + mod(-weightedSum(base, W(3, 7, 1, 3, 7, 1, 3, 7)), 10);
    },
  },
  {
    prefix: "EL",
    iso: "GR",
    name: "Greece",
    localName: "ΑΦΜ (AFM)",
    keywords: ["greece", "hellas", "afm", "el", "gr"],
    algorithm: "9 digits, powers-of-2 mod 11",
    generate: () => {
      const base = digits(8);
      let checksum = 0;
      for (const d of base) checksum = checksum * 2 + Number(d);
      return base + (((checksum * 2) % 11) % 10);
    },
  },
  {
    prefix: "ES",
    iso: "ES",
    name: "Spain",
    localName: "NIF / CIF",
    keywords: ["spain", "españa", "espana", "cif", "nif", "iva"],
    algorithm: "Company CIF: letter + 7 digits + Luhn control",
    generate: () => {
      const base = digits(7);
      return pick(["A", "B"]) + base + luhnCheckDigit(base);
    },
  },
  {
    prefix: "FI",
    iso: "FI",
    name: "Finland",
    localName: "ALV (Y-tunnus)",
    keywords: ["finland", "suomi", "alv", "y-tunnus", "ytunnus"],
    algorithm: "8 digits, weighted mod 11",
    generate: () =>
      retry(() => {
        const base = nonZeroDigits(7);
        const r = weightedSum(base, W(7, 9, 10, 5, 8, 4, 2)) % 11;
        if (r === 1) return undefined;
        return base + (r === 0 ? 0 : 11 - r);
      }),
    variants: (n: string) => [{ label: "Y-tunnus", value: `${n.slice(0, 7)}-${n.slice(7)}` }],
  },
  {
    prefix: "FR",
    iso: "FR",
    name: "France",
    localName: "TVA intracommunautaire",
    keywords: ["france", "tva", "siren"],
    algorithm: "2-digit key + 9-digit SIREN (Luhn)",
    generate: () => {
      const siren = nonZeroDigits(8);
      const full = siren + luhnCheckDigit(siren);
      const key = String((12 + 3 * (Number(full) % 97)) % 97).padStart(2, "0");
      return key + full;
    },
    format: (n) => `FR ${n.slice(0, 2)} ${groups(n.slice(2), [3, 3, 3])}`,
    variants: (n: string) => [{ label: "SIREN", value: n.slice(2) }],
  },
  {
    prefix: "HR",
    iso: "HR",
    name: "Croatia",
    localName: "PDV (OIB)",
    keywords: ["croatia", "hrvatska", "oib", "pdv"],
    algorithm: "11 digits (OIB), ISO 7064 MOD 11-10",
    generate: () => {
      const base = nonZeroDigits(10);
      return base + mod11_10(base);
    },
  },
  {
    prefix: "HU",
    iso: "HU",
    name: "Hungary",
    localName: "ANUM",
    keywords: ["hungary", "magyarország", "anum"],
    algorithm: "8 digits, 9-7-3-1 weighted mod 10",
    generate: () => {
      const base = nonZeroDigits(7);
      return base + mod(-weightedSum(base, W(9, 7, 3, 1, 9, 7, 3)), 10);
    },
  },
  {
    prefix: "IE",
    iso: "IE",
    name: "Ireland",
    localName: "VAT number",
    keywords: ["ireland", "éire", "eire"],
    algorithm: "7 digits + mod 23 check letter",
    generate: () => {
      const base = nonZeroDigits(7);
      return base + "WABCDEFGHIJKLMNOPQRSTUV"[weightedSum(base, W(8, 7, 6, 5, 4, 3, 2)) % 23];
    },
  },
  {
    prefix: "IT",
    iso: "IT",
    name: "Italy",
    localName: "Partita IVA",
    keywords: ["italy", "italia", "partita iva", "piva"],
    algorithm: "7 digits + 3-digit province office + Luhn",
    generate: () => {
      const base = nonZeroDigits(7) + String(int(1, 100)).padStart(3, "0");
      return base + luhnCheckDigit(base);
    },
  },
  {
    prefix: "LT",
    iso: "LT",
    name: "Lithuania",
    localName: "PVM mokėtojo kodas",
    keywords: ["lithuania", "lietuva", "pvm"],
    algorithm: "9 digits, two-stage weighted mod 11",
    generate: () => {
      const base = nonZeroDigits(7) + "1";
      let check = 0;
      for (let i = 0; i < 8; i++) check += (1 + (i % 9)) * Number(base[i]);
      check %= 11;
      if (check === 10) {
        check = 0;
        for (let i = 0; i < 8; i++) check += (1 + ((i + 2) % 9)) * Number(base[i]);
        check %= 11;
      }
      return base + (check % 10);
    },
  },
  {
    prefix: "LU",
    iso: "LU",
    name: "Luxembourg",
    localName: "TVA",
    keywords: ["luxembourg", "luxemburg", "tva"],
    algorithm: "6 digits + (first 6 mod 89)",
    generate: () => {
      const base = nonZeroDigits(6);
      return base + String(Number(base) % 89).padStart(2, "0");
    },
  },
  {
    prefix: "LV",
    iso: "LV",
    name: "Latvia",
    localName: "PVN",
    keywords: ["latvia", "latvija", "pvn"],
    algorithm: "11 digits (legal entity), weighted mod 11 = 3",
    generate: () =>
      retry(() => {
        const base = "4000" + digits(6);
        const check = mod(3 - weightedSum(base, W(9, 1, 4, 8, 3, 10, 2, 5, 7, 6)), 11);
        return check === 10 ? undefined : base + check;
      }),
  },
  {
    prefix: "MT",
    iso: "MT",
    name: "Malta",
    localName: "VAT number",
    keywords: ["malta"],
    algorithm: "8 digits, weighted mod 37",
    generate: () => {
      const base = nonZeroDigits(6);
      return base + String(mod(-weightedSum(base, W(3, 4, 6, 7, 8, 9)), 37)).padStart(2, "0");
    },
  },
  {
    prefix: "NL",
    iso: "NL",
    name: "Netherlands",
    localName: "btw-id",
    keywords: ["netherlands", "nederland", "holland", "btw"],
    algorithm: "9 digits (elfproef) + B01",
    generate: () =>
      retry(() => {
        const base = nonZeroDigits(8);
        const check = weightedSum(base, W(9, 8, 7, 6, 5, 4, 3, 2)) % 11;
        return check === 10 ? undefined : `${base}${check}B01`;
      }),
  },
  {
    prefix: "PL",
    iso: "PL",
    name: "Poland",
    localName: "NIP",
    keywords: ["poland", "polska", "nip"],
    algorithm: "10 digits, weighted mod 11",
    generate: () =>
      retry(() => {
        const base = nonZeroDigits(9);
        const check = weightedSum(base, W(6, 5, 7, 2, 3, 4, 5, 6, 7)) % 11;
        return check === 10 ? undefined : base + check;
      }),
    format: (n) => `PL ${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6, 8)}-${n.slice(8)}`,
  },
  {
    prefix: "PT",
    iso: "PT",
    name: "Portugal",
    localName: "NIF / NIPC",
    keywords: ["portugal", "nif", "nipc", "contribuinte"],
    algorithm: "9 digits starting with 5 (company), weighted mod 11",
    generate: () => {
      const base = "5" + digits(7);
      return base + (mod(11 - weightedSum(base, W(9, 8, 7, 6, 5, 4, 3, 2)), 11) % 10);
    },
    format: (n) => `PT ${groups(n, [3, 3, 3])}`,
  },
  {
    prefix: "RO",
    iso: "RO",
    name: "Romania",
    localName: "CUI / CIF",
    keywords: ["romania", "românia", "cui", "cif"],
    algorithm: "2–10 digits, weighted (753217532) mod 11",
    generate: () => {
      const base = nonZeroDigits(7);
      const padded = base.padStart(9, "0");
      return base + (((10 * weightedSum(padded, W(7, 5, 3, 2, 1, 7, 5, 3, 2))) % 11) % 10);
    },
  },
  {
    prefix: "SE",
    iso: "SE",
    name: "Sweden",
    localName: "Momsregistreringsnummer",
    keywords: ["sweden", "sverige", "moms", "organisationsnummer"],
    algorithm: "10-digit org. number (Luhn) + 01",
    generate: () => {
      const base = "556" + digits(6);
      return base + luhnCheckDigit(base) + "01";
    },
    variants: (n: string) => [{ label: "Organisationsnummer", value: `${n.slice(0, 6)}-${n.slice(6, 10)}` }],
  },
  {
    prefix: "SI",
    iso: "SI",
    name: "Slovenia",
    localName: "ID za DDV",
    keywords: ["slovenia", "slovenija", "ddv"],
    algorithm: "8 digits, weighted mod 11",
    generate: () =>
      retry(() => {
        const base = nonZeroDigits(7);
        const r = weightedSum(base, W(8, 7, 6, 5, 4, 3, 2)) % 11;
        if (r === 0) return undefined;
        const check = 11 - r;
        return base + (check === 10 ? 0 : check);
      }),
  },
  {
    prefix: "SK",
    iso: "SK",
    name: "Slovakia",
    localName: "IČ DPH",
    keywords: ["slovakia", "slovensko", "dph", "ic dph"],
    algorithm: "10 digits, divisible by 11",
    generate: () =>
      retry(() => {
        const base = "20" + pick(["2", "3", "4", "7", "8", "9"]) + digits(6);
        const check = Number(base) % 11;
        return check === 10 ? undefined : base + check;
      }),
  },
  // --- Non-EU -----------------------------------------------------------------------
  {
    prefix: "GB",
    iso: "GB",
    name: "United Kingdom",
    localName: "VAT registration number",
    keywords: ["united kingdom", "uk", "great britain", "england", "hmrc"],
    algorithm: "9 digits, HMRC mod 97 (9755)",
    generate: () => {
      const base = String(int(1, 4)) + digits(6);
      return base + String(mod(42 - weightedSum(base, W(8, 7, 6, 5, 4, 3, 2)), 97)).padStart(2, "0");
    },
    format: (n) => `GB ${groups(n, [3, 4, 2])}`,
  },
  {
    prefix: "XI",
    iso: "GB",
    name: "Northern Ireland",
    localName: "VAT (EU trade, Windsor Framework)",
    keywords: ["northern ireland", "xi", "ni"],
    algorithm: "9 digits, HMRC mod 97 (9755)",
    generate: () => {
      const base = String(int(1, 4)) + digits(6);
      return base + String(mod(42 - weightedSum(base, W(8, 7, 6, 5, 4, 3, 2)), 97)).padStart(2, "0");
    },
    format: (n) => `XI ${groups(n, [3, 4, 2])}`,
  },
  {
    prefix: "CHE",
    iso: "CH",
    name: "Switzerland",
    localName: "MWST / TVA / IVA (UID)",
    keywords: ["switzerland", "schweiz", "suisse", "mwst", "uid", "che"],
    algorithm: "CHE + 9 digits (UID), weighted mod 11",
    generate: () =>
      retry(() => {
        const base = nonZeroDigits(8);
        const check = mod(11 - weightedSum(base, W(5, 4, 3, 2, 7, 6, 5, 4)), 11);
        return check === 10 ? undefined : base + check;
      }),
    format: (n) => `CHE-${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)} MWST`,
    compact: (n) => `CHE${n}MWST`,
    variants: (n: string) => [{ label: "UID", value: `CHE-${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}` }],
  },
  {
    prefix: "NO",
    iso: "NO",
    name: "Norway",
    localName: "MVA (organisasjonsnummer)",
    keywords: ["norway", "norge", "mva", "organisasjonsnummer"],
    algorithm: "9-digit org. number (mod 11) + MVA",
    generate: () =>
      retry(() => {
        const base = pick(["8", "9"]) + digits(7);
        const r = weightedSum(base, W(3, 2, 7, 6, 5, 4, 3, 2)) % 11;
        const check = r === 0 ? 0 : 11 - r;
        return check === 10 ? undefined : base + check;
      }),
    format: (n) => `NO ${groups(n, [3, 3, 3])} MVA`,
    compact: (n) => `NO${n}MVA`,
    variants: (n: string) => [{ label: "Organisasjonsnummer", value: n }],
  },
];

export const VAT_COUNTRIES = vatCountries;

export function generateVat(country: VatCountry): Generated {
  const national = country.generate();
  const compact = country.compact ? country.compact(national) : country.prefix + national;
  const formatted = country.format ? country.format(national) : `${country.prefix} ${national}`;
  const extra = country.variants?.(national) ?? [];
  return {
    compact,
    formatted,
    variants: [{ label: "Without country prefix", value: national }, ...extra],
    fields: [
      { label: "Country", value: `${country.name} (${country.prefix})` },
      { label: "Local name", value: country.localName },
      { label: "Compact", value: compact },
      { label: "Formatted", value: formatted },
      { label: "Validation", value: country.algorithm },
    ],
  };
}

export function vatCountry(prefixOrIso: string): VatCountry | undefined {
  return VAT_COUNTRIES.find((c) => c.prefix === prefixOrIso) ?? VAT_COUNTRIES.find((c) => c.iso === prefixOrIso);
}
