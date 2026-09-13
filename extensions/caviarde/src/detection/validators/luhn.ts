/** Gates card, SIREN and SIRET matches: a bare digit-run regex catches prose. */
export function isLuhnValid(digits: string): boolean {
  if (digits.length === 0 || !/^\d+$/.test(digits)) return false;

  let sum = 0;
  let double = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let value = digits.charCodeAt(i) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }

  return sum % 10 === 0;
}
