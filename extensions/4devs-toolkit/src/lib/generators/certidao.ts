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

  const serventia = String(Math.floor(Math.random() * 900000) + 100000);
  const uf = String(Math.floor(Math.random() * 27) + 1).padStart(2, "0");

  const baseNumber = `${serventia}${uf}${year}${bookType}${String(book).padStart(5, "0")}${String(page).padStart(3, "0")}${term}`;

  const checkDigits = calculateCheckDigits(baseNumber);

  return baseNumber + checkDigits;
}

function calculateCheckDigits(baseNumber: string): string {
  const digits = baseNumber.split("").map(Number);
  // Standard mod 11 weights for check digit calculation
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7];

  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * weights[i];
  }

  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;

  return String(checkDigit).padStart(2, "0");
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
    nascimento: "Nascimento",
    casamento: "Casamento",
    casamento_religioso: "Casamento com Efeito Religioso",
    obito: "Óbito",
  };
  return names[type];
}
