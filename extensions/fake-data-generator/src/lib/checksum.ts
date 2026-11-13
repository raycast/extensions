/** Weighted digit sum: sum(digit[i] * weights[i]). */
export function weightedSum(value: string, weights: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) sum += Number(value[i]) * weights[i];
  return sum;
}

/** Positive modulo (JS `%` keeps the sign of the dividend). */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Remainder of a (possibly very long) numeric string divided by 97. */
export function mod97(numeric: string): number {
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) remainder = (remainder * 10 + numeric.charCodeAt(i) - 48) % 97;
  return remainder;
}

/** Converts letters to numbers as used by IBAN / ISO 7064 (A=10 ... Z=35). */
export function lettersToNumeric(value: string): string {
  return value.toUpperCase().replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
}

/** ISO 7064 MOD 97-10: two check digits so that `base + check` mod 97 === 1. */
export function mod97_10(base: string): string {
  return String(98 - mod97(lettersToNumeric(base) + "00")).padStart(2, "0");
}

/** ISO 7064 MOD 11-10 check digit (German VAT, Croatian OIB, Croatian bank accounts). */
export function mod11_10(base: string): string {
  let product = 10;
  for (const ch of base) {
    const sum = (product + Number(ch)) % 10 || 10;
    product = (sum * 2) % 11;
  }
  return String((11 - product) % 10);
}

/** Luhn sum of a full number (check digit included). Valid numbers return 0. */
export function luhnChecksum(value: string): number {
  let sum = 0;
  for (let i = 0; i < value.length; i++) {
    let d = Number(value[value.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10;
}

/** Luhn check digit to append to `base`. */
export function luhnCheckDigit(base: string): string {
  return String((10 - luhnChecksum(base + "0")) % 10);
}

/** GS1 (GTIN/EAN) check digit to append to `base`. */
export function gs1CheckDigit(base: string): string {
  let sum = 0;
  for (let i = 0; i < base.length; i++) sum += Number(base[base.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return String((10 - (sum % 10)) % 10);
}
