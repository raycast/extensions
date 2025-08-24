export type CardBrand = "visa" | "mastercard" | "amex" | "diners" | "discover" | "jcb" | "elo" | "hiper" | "aura";

export interface CardOptions {
  brand?: CardBrand;
  includeExpiry?: boolean;
  includeCVV?: boolean;
  masked?: boolean;
  quantity?: number;
}

export interface GeneratedCard {
  number: string;
  brand: CardBrand;
  expiry?: string;
  cvv?: string;
}

const CARD_PATTERNS: Record<CardBrand, { prefixes: string[]; length: number[]; cvvLength: number }> = {
  visa: { prefixes: ["4"], length: [13, 16, 19], cvvLength: 3 },
  mastercard: { prefixes: ["51", "52", "53", "54", "55", "222100-272099"], length: [16], cvvLength: 3 },
  amex: { prefixes: ["34", "37"], length: [15], cvvLength: 4 },
  diners: { prefixes: ["36", "38", "300", "301", "302", "303", "304", "305"], length: [14], cvvLength: 3 },
  discover: {
    prefixes: ["6011", "622126-622925", "644", "645", "646", "647", "648", "649", "65"],
    length: [16, 19],
    cvvLength: 3,
  },
  jcb: { prefixes: ["3528-3589"], length: [16, 19], cvvLength: 3 },
  elo: {
    prefixes: ["4011", "4312", "4389", "4514", "4576", "5041", "5066", "5090", "6277", "6362", "6363", "6516"],
    length: [16],
    cvvLength: 3,
  },
  hiper: { prefixes: ["6370", "6376", "6062"], length: [16, 19], cvvLength: 3 },
  aura: { prefixes: ["50"], length: [16], cvvLength: 3 },
};

function luhnCalculate(digits: number[]): number {
  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return (10 - (sum % 10)) % 10;
}

function generateCardNumber(brand: CardBrand): string {
  const pattern = CARD_PATTERNS[brand];
  const length = pattern.length[Math.floor(Math.random() * pattern.length.length)];

  let prefix: string;
  const prefixChoice = pattern.prefixes[Math.floor(Math.random() * pattern.prefixes.length)];

  if (prefixChoice.includes("-")) {
    const [min, max] = prefixChoice.split("-").map((s) => parseInt(s, 10));
    const randomPrefix = Math.floor(Math.random() * (max - min + 1)) + min;
    prefix = String(randomPrefix);
  } else {
    prefix = prefixChoice;
  }

  const remainingLength = length - prefix.length - 1;
  let cardNumber = prefix;

  for (let i = 0; i < remainingLength; i++) {
    cardNumber += Math.floor(Math.random() * 10);
  }

  const digits = cardNumber.split("").map(Number);
  const checkDigit = luhnCalculate(digits);

  return cardNumber + checkDigit;
}

function generateCVV(brand: CardBrand): string {
  const cvvLength = CARD_PATTERNS[brand].cvvLength;
  let cvv = "";
  for (let i = 0; i < cvvLength; i++) {
    cvv += Math.floor(Math.random() * 10);
  }
  return cvv;
}

function generateExpiry(): string {
  const currentYear = new Date().getFullYear();
  const year = currentYear + Math.floor(Math.random() * 5) + 1;
  const month = Math.floor(Math.random() * 12) + 1;
  return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
}

export function generateCard(options: CardOptions = {}): GeneratedCard {
  const { brand = "visa", includeExpiry = true, includeCVV = true, masked = true } = options;

  const cardNumber = generateCardNumber(brand);

  const card: GeneratedCard = {
    number: masked ? maskCardNumber(cardNumber) : cardNumber,
    brand,
  };

  if (includeExpiry) {
    card.expiry = generateExpiry();
  }

  if (includeCVV) {
    card.cvv = generateCVV(brand);
  }

  return card;
}

export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, "");
  const groups = [];

  if (cleaned.length === 15) {
    groups.push(cleaned.slice(0, 4), cleaned.slice(4, 10), cleaned.slice(10, 15));
  } else if (cleaned.length === 14) {
    groups.push(cleaned.slice(0, 4), cleaned.slice(4, 10), cleaned.slice(10, 14));
  } else {
    for (let i = 0; i < cleaned.length; i += 4) {
      groups.push(cleaned.slice(i, i + 4));
    }
  }

  return groups.join(" ");
}

export function unmaskCardNumber(cardNumber: string): string {
  return cardNumber.replace(/\D/g, "");
}

export function validateCardNumber(cardNumber: string): boolean {
  const cleaned = unmaskCardNumber(cardNumber);

  if (!/^\d+$/.test(cleaned)) {
    return false;
  }

  const digits = cleaned.split("").map(Number);
  const checkDigit = digits.pop();
  const calculatedCheckDigit = luhnCalculate(digits);

  return checkDigit === calculatedCheckDigit;
}

export function generateMultipleCards(options: CardOptions = {}): GeneratedCard[] {
  const quantity = options.quantity || 1;
  const cards: GeneratedCard[] = [];

  for (let i = 0; i < quantity; i++) {
    cards.push(generateCard(options));
  }

  return cards;
}

export function getCardBrandName(brand: CardBrand): string {
  const names: Record<CardBrand, string> = {
    visa: "Visa",
    mastercard: "MasterCard",
    amex: "American Express",
    diners: "Diners Club",
    discover: "Discover",
    jcb: "JCB",
    elo: "Elo",
    hiper: "Hiper",
    aura: "Aura",
  };
  return names[brand];
}
