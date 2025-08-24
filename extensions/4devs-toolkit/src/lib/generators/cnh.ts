export interface CNHOptions {
  masked?: boolean;
  quantity?: number;
}

function calculateCNHCheckDigits(digits: number[]): number[] {
  let sequence = 2;
  let sum1 = 0;
  let sum2 = 0;

  for (let i = 0; i < 9; i++) {
    sum1 += digits[i] * sequence;
    sequence++;
  }

  const dv1 = sum1 % 11;
  const firstCheckDigit = dv1 <= 1 ? 0 : 11 - dv1;

  sequence = 3;
  for (let i = 0; i < 9; i++) {
    sum2 += digits[i] * sequence;
    sequence++;
  }
  sum2 += firstCheckDigit * 2;

  const dv2 = sum2 % 11;
  const secondCheckDigit = dv2 <= 1 ? 0 : 11 - dv2;

  return [firstCheckDigit, secondCheckDigit];
}

export function generateCNH(options: CNHOptions = {}): string {
  const { masked = true } = options;

  const randomDigits: number[] = [];
  for (let i = 0; i < 9; i++) {
    randomDigits.push(Math.floor(Math.random() * 10));
  }

  const checkDigits = calculateCNHCheckDigits(randomDigits);
  const cnhDigits = [...randomDigits, ...checkDigits];

  const cnhString = cnhDigits.join("");

  if (masked) {
    return maskCNH(cnhString);
  }

  return cnhString;
}

export function maskCNH(cnh: string): string {
  const cleaned = cnh.replace(/\D/g, "");
  if (cleaned.length !== 11) {
    throw new Error("CNH must have 11 digits");
  }
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9, 11)}`;
}

export function unmaskCNH(cnh: string): string {
  return cnh.replace(/\D/g, "");
}

export function validateCNH(cnh: string): boolean {
  const cleaned = unmaskCNH(cnh);

  if (cleaned.length !== 11) {
    return false;
  }

  // Prevent CNHs with all identical digits (e.g., 11111111111, 22222222222)
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }

  const digits = cleaned.split("").map(Number);
  const baseDigits = digits.slice(0, 9);
  const checkDigits = calculateCNHCheckDigits(baseDigits);

  return digits[9] === checkDigits[0] && digits[10] === checkDigits[1];
}

export function generateMultipleCNHs(options: CNHOptions = {}): string[] {
  const quantity = options.quantity || 1;
  const cnhs: string[] = [];

  for (let i = 0; i < quantity; i++) {
    cnhs.push(generateCNH(options));
  }

  return cnhs;
}
