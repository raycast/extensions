export type CertidaoType = "nascimento" | "casamento" | "casamento_religioso" | "obito";

export interface CertidaoOptions {
  type?: CertidaoType;
  masked?: boolean;
  quantity?: number;
}

function generateMatricula(): string {
  const year = 2020 + Math.floor(Math.random() * 5);
  const bookType = Math.floor(Math.random() * 2) + 1;
  const book = Math.floor(Math.random() * 900) + 100;
  const page = Math.floor(Math.random() * 300) + 1;
  const term = Math.floor(Math.random() * 90000) + 10000;
  const typeCode = Math.floor(Math.random() * 9) + 1;
  const sequential = Math.floor(Math.random() * 999) + 1;

  const serventia = String(Math.floor(Math.random() * 900000) + 100000);
  const uf = String(Math.floor(Math.random() * 27) + 1).padStart(2, "0");

  const baseNumber = `${serventia}${uf}${year}${bookType}${String(book).padStart(5, "0")}${String(page).padStart(3, "0")}${term}${typeCode}${String(sequential).padStart(3, "0")}`;

  const checkDigits = calculateCheckDigits(baseNumber);

  return baseNumber + checkDigits;
}

function calculateCheckDigits(baseNumber: string): string {
  const digits = baseNumber.split("").map(Number);

  // First check digit - weights for 30 digits
  const weights1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  let sum1 = 0;
  for (let i = 0; i < digits.length; i++) {
    sum1 += digits[i] * weights1[i];
  }

  const checkDigit1 = sum1 % 11;

  // Second check digit includes the first check digit
  const extendedDigits = [...digits, checkDigit1];
  const weights2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1];

  let sum2 = 0;
  for (let i = 0; i < extendedDigits.length; i++) {
    sum2 += extendedDigits[i] * weights2[i];
  }

  const checkDigit2 = sum2 % 11;

  return String(checkDigit1) + String(checkDigit2);
}

export function generateCertidao(options: CertidaoOptions = {}): string {
  const { masked = true } = options;

  const matricula = generateMatricula();

  if (masked) {
    return maskCertidao(matricula);
  }

  return matricula;
}

export function maskCertidao(certidao: string): string {
  const cleaned = certidao.replace(/\D/g, "");
  if (cleaned.length !== 32) {
    throw new Error("Certidão must have 32 digits");
  }

  const formatted =
    `${cleaned.slice(0, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 12)} ${cleaned.slice(12, 13)} ` +
    `${cleaned.slice(13, 18)} ${cleaned.slice(18, 21)} ${cleaned.slice(21, 26)} ${cleaned.slice(26, 32)}`;

  return formatted;
}

export function unmaskCertidao(certidao: string): string {
  return certidao.replace(/\D/g, "");
}

export function validateCertidao(certidao: string): boolean {
  const cleaned = unmaskCertidao(certidao);

  if (cleaned.length !== 32) {
    return false;
  }

  const baseNumber = cleaned.slice(0, 30);
  const providedCheckDigits = cleaned.slice(30, 32);
  const calculatedCheckDigits = calculateCheckDigits(baseNumber);

  return providedCheckDigits === calculatedCheckDigits;
}

export function generateMultipleCertidoes(options: CertidaoOptions = {}): string[] {
  const quantity = options.quantity || 1;
  const certidoes: string[] = [];

  for (let i = 0; i < quantity; i++) {
    certidoes.push(generateCertidao(options));
  }

  return certidoes;
}

export function getCertidaoTypeName(type: CertidaoType): string {
  const names: Record<CertidaoType, string> = {
    nascimento: "Birth",
    casamento: "Marriage",
    casamento_religioso: "Religious Marriage",
    obito: "Death",
  };
  return names[type];
}
