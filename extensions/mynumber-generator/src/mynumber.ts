const MY_NUMBER_LENGTH = 12;
const BASE_LENGTH = MY_NUMBER_LENGTH - 1;

/**
 * 総務省令第85号に定められた検査用数字（チェックデジット）の算出。
 * Pn は検査用数字を除いた11桁のうち最下位から数えて n 番目の数字、
 * Qn は n <= 6 のとき n + 1、n >= 7 のとき n - 5。
 * 11 - (Σ Pn × Qn mod 11) を検査用数字とし、余りが 1 以下の場合は 0 とする。
 */
export function calculateCheckDigit(baseDigits: string): number {
  if (!/^\d{11}$/.test(baseDigits)) {
    throw new Error(`baseDigits must be 11 digits, got: ${baseDigits}`);
  }

  let sum = 0;
  for (let n = 1; n <= BASE_LENGTH; n++) {
    const p = Number(baseDigits[BASE_LENGTH - n]);
    const q = n <= 6 ? n + 1 : n - 5;
    sum += p * q;
  }

  const remainder = sum % 11;
  return remainder <= 1 ? 0 : 11 - remainder;
}

export function isValidMyNumber(myNumber: string): boolean {
  if (!/^\d{12}$/.test(myNumber)) {
    return false;
  }
  return calculateCheckDigit(myNumber.slice(0, BASE_LENGTH)) === Number(myNumber[BASE_LENGTH]);
}

export function generateMyNumber(): string {
  const base = Array.from({ length: BASE_LENGTH }, () => Math.floor(Math.random() * 10)).join("");
  return base + calculateCheckDigit(base);
}

export function formatMyNumber(myNumber: string, hyphenSeparated: boolean): string {
  return hyphenSeparated ? myNumber.replace(/^(\d{4})(\d{4})(\d{4})$/, "$1-$2-$3") : myNumber;
}
