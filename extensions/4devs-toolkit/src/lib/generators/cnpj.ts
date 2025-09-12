export interface CNPJOptions {
  masked?: boolean;
  quantity?: number;
}

function calculateCNPJCheckDigits(digits: number[]): number[] {
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const firstCheckDigit = calculateCheckDigit(digits, weights1);
  const secondCheckDigit = calculateCheckDigit([...digits, firstCheckDigit], weights2);

  return [firstCheckDigit, secondCheckDigit];
}

function calculateCheckDigit(digits: number[], weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * weights[i];
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function generateCNPJ(options: CNPJOptions = {}): string {
  const { masked = true } = options;

  const randomDigits: number[] = [];
  for (let i = 0; i < 8; i++) {
    randomDigits.push(Math.floor(Math.random() * 10));
  }

  randomDigits.push(0, 0, 0, 1);

  const checkDigits = calculateCNPJCheckDigits(randomDigits);
  const cnpjDigits = [...randomDigits, ...checkDigits];

  const cnpjString = cnpjDigits.join("");

  if (masked) {
    return maskCNPJ(cnpjString);
  }

  return cnpjString;
}

export function maskCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) {
    throw new Error("CNPJ must have 14 digits");
  }
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
}

export function unmaskCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

export function validateCNPJ(cnpj: string): boolean {
  const cleaned = unmaskCNPJ(cnpj);

  if (cleaned.length !== 14) {
    return false;
  }

  if (/^(\d)\1{13}$/.test(cleaned)) {
    return false;
  }

  const digits = cleaned.split("").map(Number);
  const baseDigits = digits.slice(0, 12);
  const checkDigits = calculateCNPJCheckDigits(baseDigits);

  return digits[12] === checkDigits[0] && digits[13] === checkDigits[1];
}

export function generateMultipleCNPJs(options: CNPJOptions = {}): string[] {
  const quantity = options.quantity || 1;
  const cnpjs: string[] = [];

  for (let i = 0; i < quantity; i++) {
    cnpjs.push(generateCNPJ(options));
  }

  return cnpjs;
}
