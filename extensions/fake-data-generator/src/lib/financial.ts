import { luhnCheckDigit, mod, weightedSum } from "./checksum";
import { IBAN_COUNTRIES, syntheticBic } from "./iban";
import { digits, int, nonZeroDigits, pick } from "./random";
import { Generated, groups } from "./types";

export interface FinancialItem {
  id: string;
  title: string;
  /** ISO code for a flag, or undefined for a generic icon. */
  iso?: string;
  keywords: string[];
  generate: () => Generated;
}

// --- Payment cards -------------------------------------------------------------------

interface CardBrand {
  id: string;
  name: string;
  length: number;
  cvvLength: number;
  prefix: () => string;
  grouping: number[];
}

const CARD_BRANDS: CardBrand[] = [
  { id: "visa", name: "Visa", length: 16, cvvLength: 3, prefix: () => "4", grouping: [4, 4, 4, 4] },
  {
    id: "mastercard",
    name: "Mastercard",
    length: 16,
    cvvLength: 3,
    prefix: () => (int(0, 1) ? String(int(51, 55)) : String(int(2221, 2720))),
    grouping: [4, 4, 4, 4],
  },
  {
    id: "amex",
    name: "American Express",
    length: 15,
    cvvLength: 4,
    prefix: () => pick(["34", "37"]),
    grouping: [4, 6, 5],
  },
  { id: "discover", name: "Discover", length: 16, cvvLength: 3, prefix: () => "6011", grouping: [4, 4, 4, 4] },
  { id: "jcb", name: "JCB", length: 16, cvvLength: 3, prefix: () => String(int(3528, 3589)), grouping: [4, 4, 4, 4] },
];

function card(brand: CardBrand): Generated {
  const prefix = brand.prefix();
  const base = prefix + digits(brand.length - prefix.length - 1);
  const number = base + luhnCheckDigit(base);
  const now = new Date();
  const expiry = new Date(now.getFullYear() + int(1, 5), int(0, 11), 1);
  const exp = `${String(expiry.getMonth() + 1).padStart(2, "0")}/${String(expiry.getFullYear() % 100)}`;
  const cvv = digits(brand.cvvLength);
  return {
    compact: number,
    formatted: groups(number, brand.grouping),
    variants: [
      { label: "Expiry (MM/YY)", value: exp },
      { label: brand.id === "amex" ? "CID" : "CVC", value: cvv },
      { label: "Number | expiry | CVC", value: `${number}|${exp}|${cvv}` },
    ],
    fields: [
      { label: "Brand", value: brand.name },
      { label: "Number", value: groups(number, brand.grouping) },
      { label: "Expiry", value: exp },
      { label: brand.id === "amex" ? "CID" : "CVC", value: cvv },
      { label: "Validation", value: "Luhn check digit (random — will be declined by real processors)" },
    ],
  };
}

/** Documented Stripe test-mode card numbers (https://docs.stripe.com/testing). */
const STRIPE_CARDS = [
  { id: "stripe-visa", title: "Visa — succeeds", number: "4242424242424242", grouping: [4, 4, 4, 4] },
  { id: "stripe-mc", title: "Mastercard — succeeds", number: "5555555555554444", grouping: [4, 4, 4, 4] },
  { id: "stripe-amex", title: "Amex — succeeds", number: "378282246310005", grouping: [4, 6, 5] },
  { id: "stripe-3ds", title: "Visa — requires 3D Secure", number: "4000002500003155", grouping: [4, 4, 4, 4] },
  { id: "stripe-declined", title: "Visa — generic decline", number: "4000000000000002", grouping: [4, 4, 4, 4] },
  { id: "stripe-funds", title: "Visa — insufficient funds", number: "4000000000009995", grouping: [4, 4, 4, 4] },
];

function stripeCard(number: string, grouping: number[]): Generated {
  const exp = `12/${String((new Date().getFullYear() + 3) % 100)}`;
  const cvv = number.length === 15 ? "1234" : "123";
  return {
    compact: number,
    formatted: groups(number, grouping),
    variants: [
      { label: "Expiry (any future date)", value: exp },
      { label: "CVC (any)", value: cvv },
    ],
    fields: [
      { label: "Number", value: groups(number, grouping) },
      { label: "Expiry", value: `${exp} (any future date works)` },
      { label: "CVC", value: `${cvv} (any value works)` },
      { label: "Works in", value: "Stripe test mode only" },
    ],
  };
}

// --- Bank routing ----------------------------------------------------------------------

export function abaRouting(): Generated {
  const base = String(int(1, 12)).padStart(2, "0") + digits(6);
  const check = mod(-weightedSum(base, [3, 7, 1, 3, 7, 1, 3, 7]), 10);
  const value = base + check;
  return {
    compact: value,
    formatted: value,
    variants: [{ label: "Account number", value: nonZeroDigits(int(9, 12)) }],
    fields: [
      { label: "Federal Reserve district", value: value.slice(0, 2) },
      { label: "Validation", value: "ABA checksum (3-7-1 weights)" },
    ],
  };
}

function usAccount(): Generated {
  const value = nonZeroDigits(int(9, 12));
  return { compact: value, formatted: value };
}

function ukSortCode(): Generated {
  const bank = pick([
    { name: "Barclays", prefix: "20" },
    { name: "Lloyds", prefix: "30" },
    { name: "HSBC", prefix: "40" },
    { name: "NatWest", prefix: "60" },
  ]);
  const sort = bank.prefix + digits(4);
  const account = digits(8);
  return {
    compact: sort + account,
    formatted: `${sort.slice(0, 2)}-${sort.slice(2, 4)}-${sort.slice(4)} ${account}`,
    variants: [
      { label: "Sort code", value: `${sort.slice(0, 2)}-${sort.slice(2, 4)}-${sort.slice(4)}` },
      { label: "Account number", value: account },
    ],
    fields: [
      { label: "Bank", value: bank.name },
      { label: "Note", value: "Format-valid; UK modulus checks (VocaLink) are not applied" },
    ],
  };
}

function auBsb(): Generated {
  const bank = pick([
    { name: "Commonwealth Bank", prefix: "062" },
    { name: "Westpac", prefix: "032" },
    { name: "NAB", prefix: "082" },
    { name: "ANZ", prefix: "012" },
  ]);
  const bsb = bank.prefix + digits(3);
  const account = nonZeroDigits(8);
  return {
    compact: bsb + account,
    formatted: `${bsb.slice(0, 3)}-${bsb.slice(3)} ${account}`,
    variants: [
      { label: "BSB", value: `${bsb.slice(0, 3)}-${bsb.slice(3)}` },
      { label: "Account number", value: account },
    ],
    fields: [{ label: "Bank", value: bank.name }],
  };
}

// --- BIC -------------------------------------------------------------------------------

/** Real, public BICs from the IBAN bank tables (one random bank per call). */
function bicFor(countryCode: string): (() => Generated) | undefined {
  const country = IBAN_COUNTRIES.find((c) => c.code === countryCode);
  if (!country?.banks?.length) return undefined;
  return () => {
    const bank = pick(country.banks!);
    const bic11 = bank.bic.length === 8 ? bank.bic + "XXX" : bank.bic;
    return {
      compact: bank.bic,
      formatted: bank.bic,
      variants: [
        { label: "BIC (11 characters)", value: bic11 },
        { label: "Bank name", value: bank.name },
      ],
      fields: [
        { label: "Bank", value: bank.name },
        { label: "Bank code", value: bic11.slice(0, 4) },
        { label: "Country", value: bic11.slice(4, 6) },
        { label: "Location", value: bic11.slice(6, 8) },
        { label: "Branch", value: bic11.slice(8) },
      ],
    };
  };
}

function syntheticBicItem(): Generated {
  const bic = syntheticBic(pick(IBAN_COUNTRIES).code);
  return {
    compact: bic,
    formatted: bic,
    variants: [{ label: "BIC (11 characters)", value: bic + "XXX" }],
    fields: [{ label: "Note", value: "Random bank code. Location code ending in 0 marks an ISO 9362 test BIC." }],
  };
}

export interface FinancialSection {
  title: string;
  items: FinancialItem[];
}

export function financialSections(): FinancialSection[] {
  const bicItems: FinancialItem[] = IBAN_COUNTRIES.flatMap((c) => {
    const gen = bicFor(c.code);
    return gen
      ? [
          {
            id: `bic-${c.code}`,
            title: c.name,
            iso: c.code,
            keywords: ["bic", "swift", c.code, ...c.keywords],
            generate: gen,
          },
        ]
      : [];
  });

  return [
    {
      title: "Payment Cards (random, Luhn-valid)",
      items: CARD_BRANDS.map((brand) => ({
        id: `card-${brand.id}`,
        title: brand.name,
        keywords: ["card", "credit", "debit", brand.id],
        generate: () => card(brand),
      })),
    },
    {
      title: "Stripe Test Cards",
      items: STRIPE_CARDS.map((c) => ({
        id: c.id,
        title: c.title,
        keywords: ["stripe", "test", "card", "credit"],
        generate: () => stripeCard(c.number, c.grouping),
      })),
    },
    {
      title: "Bank Details",
      items: [
        {
          id: "us-aba",
          title: "ABA Routing Number",
          iso: "US",
          keywords: ["us", "routing", "aba", "rtn", "ach"],
          generate: abaRouting,
        },
        {
          id: "us-account",
          title: "US Bank Account Number",
          iso: "US",
          keywords: ["us", "account"],
          generate: usAccount,
        },
        {
          id: "uk-sort",
          title: "Sort Code + Account",
          iso: "GB",
          keywords: ["uk", "sort code", "account"],
          generate: ukSortCode,
        },
        { id: "au-bsb", title: "BSB + Account", iso: "AU", keywords: ["australia", "bsb", "account"], generate: auBsb },
      ],
    },
    {
      title: "BIC / SWIFT (real bank codes)",
      items: [
        {
          id: "bic-synthetic",
          title: "Synthetic test BIC",
          keywords: ["bic", "swift", "random", "fake"],
          generate: syntheticBicItem,
        },
        ...bicItems,
      ],
    },
  ];
}
