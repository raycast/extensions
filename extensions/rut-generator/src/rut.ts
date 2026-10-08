export type RutFormat = "dots" | "dash" | "plain";

const MIN_RUT_BODY = 1_000_000;
const MAX_RUT_BODY = 30_000_000;
const DEFAULT_RUT_COUNT = 10;

export function calculateVerificationDigit(rutBody: number): string {
  if (!Number.isInteger(rutBody) || rutBody <= 0) {
    throw new Error("RUT body must be a positive integer");
  }

  let multiplier = 2;
  let sum = 0;

  for (const digit of String(rutBody).split("").reverse()) {
    sum += Number(digit) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const result = 11 - (sum % 11);

  if (result === 11) {
    return "0";
  }

  if (result === 10) {
    return "K";
  }

  return String(result);
}

export function formatRut(rutBody: number, verificationDigit: string, format: RutFormat): string {
  const normalizedDigit = verificationDigit.toUpperCase();

  if (format === "plain") {
    return `${rutBody}${normalizedDigit}`;
  }

  if (format === "dash") {
    return `${rutBody}-${normalizedDigit}`;
  }

  return `${new Intl.NumberFormat("es-CL").format(rutBody)}-${normalizedDigit}`;
}

export function generateRut(format: RutFormat = "dots"): string {
  const rutBody = generateRutBody();
  return formatRut(rutBody, calculateVerificationDigit(rutBody), format);
}

export function generateRuts(format: RutFormat = "dots", count = DEFAULT_RUT_COUNT): string[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("RUT count must be a positive integer");
  }

  return Array.from({ length: count }, () => generateRut(format));
}

export function generateRutBody(): number {
  const range = MAX_RUT_BODY - MIN_RUT_BODY + 1;
  return Math.floor(Math.random() * range) + MIN_RUT_BODY;
}
