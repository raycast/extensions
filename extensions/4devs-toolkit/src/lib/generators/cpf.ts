export interface CPFOptions {
  state?: string;
  masked?: boolean;
  quantity?: number;
}

const STATE_CODES: Record<string, number> = {
  RS: 0,
  DF: 1,
  GO: 1,
  MS: 1,
  MT: 1,
  TO: 1,
  AC: 2,
  AM: 2,
  AP: 2,
  PA: 2,
  RO: 2,
  RR: 2,
  CE: 3,
  MA: 3,
  PI: 3,
  AL: 4,
  PB: 4,
  PE: 4,
  RN: 4,
  BA: 5,
  SE: 5,
  MG: 6,
  ES: 7,
  RJ: 7,
  SP: 8,
  PR: 9,
  SC: 9,
};

function calculateCPFCheckDigits(digits: number[]): number[] {
  const firstCheckDigit = calculateCheckDigit(digits, 10);
  const secondCheckDigit = calculateCheckDigit([...digits, firstCheckDigit], 11);
  return [firstCheckDigit, secondCheckDigit];
}

function calculateCheckDigit(digits: number[], startMultiplier: number): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (startMultiplier - i);
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function generateCPF(options: CPFOptions = {}): string {
  const { state, masked = true } = options;

  const randomDigits: number[] = [];
  for (let i = 0; i < 8; i++) {
    randomDigits.push(Math.floor(Math.random() * 10));
  }

  let ninthDigit: number;
  if (state && STATE_CODES[state] !== undefined) {
    ninthDigit = STATE_CODES[state];
  } else {
    ninthDigit = Math.floor(Math.random() * 10);
  }
  randomDigits.push(ninthDigit);

  const checkDigits = calculateCPFCheckDigits(randomDigits);
  const cpfDigits = [...randomDigits, ...checkDigits];

  const cpfString = cpfDigits.join("");

  if (masked) {
    return maskCPF(cpfString);
  }

  return cpfString;
}

export function maskCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) {
    throw new Error("CPF must have 11 digits");
  }
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
}

export function unmaskCPF(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function validateCPF(cpf: string): boolean {
  const cleaned = unmaskCPF(cpf);

  if (cleaned.length !== 11) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }

  const digits = cleaned.split("").map(Number);
  const baseDigits = digits.slice(0, 9);
  const checkDigits = calculateCPFCheckDigits(baseDigits);

  return digits[9] === checkDigits[0] && digits[10] === checkDigits[1];
}

export function generateMultipleCPFs(options: CPFOptions = {}): string[] {
  const quantity = options.quantity || 1;
  const cpfs: string[] = [];

  for (let i = 0; i < quantity; i++) {
    cpfs.push(generateCPF(options));
  }

  return cpfs;
}
