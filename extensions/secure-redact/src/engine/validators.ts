export function luhn(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (alternate) {
      digit *= 2;
      if (digit > 9) digit = (digit % 10) + 1;
    }

    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

export function iban(value: string): boolean {
  const normalized = value.replace(/\s/g, "").toUpperCase();
  if (normalized.length < 15 || normalized.length > 34) return false;

  const rearranged = normalized.slice(4) + normalized.slice(0, 4);

  let numericString = "";
  for (const char of rearranged) {
    if (char >= "A" && char <= "Z") {
      numericString += (char.charCodeAt(0) - 55).toString();
    } else {
      numericString += char;
    }
  }

  const remainder = mod97(numericString);
  return remainder === 1;
}

function mod97(numericString: string): number {
  let remainder = 0;
  for (let i = 0; i < numericString.length; i++) {
    remainder = (remainder * 10 + parseInt(numericString[i], 10)) % 97;
  }
  return remainder;
}

export function vin(value: string): boolean {
  const normalized = value.replace(/[-\s]/g, "").toUpperCase();
  if (normalized.length !== 17) return false;

  if (/[IOQ]/.test(normalized)) return false;

  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const checkDigit = normalized[8];

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    if (i === 8) continue;
    const char = normalized[i];
    const value =
      char >= "0" && char <= "9" ? parseInt(char, 10) : getVinLetterValue(char);
    sum += value * weights[i];
  }

  const remainder = sum % 11;
  const expectedCheck = remainder === 10 ? "X" : remainder.toString();

  return checkDigit === expectedCheck;
}

function getVinLetterValue(letter: string): number {
  const values: { [key: string]: number } = {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
    F: 6,
    G: 7,
    H: 8,
    J: 1,
    K: 2,
    L: 3,
    M: 4,
    N: 5,
    P: 7,
    R: 9,
    S: 2,
    T: 3,
    U: 4,
    V: 5,
    W: 6,
    X: 7,
    Y: 8,
    Z: 9,
  };
  return values[letter] || 0;
}

export function ssn(value: string): boolean {
  const normalized = value.replace(/[-\s]/g, "");
  if (normalized.length !== 9) return false;

  const area = normalized.slice(0, 3);
  const group = normalized.slice(3, 5);
  const serial = normalized.slice(5, 9);

  if (area === "000" || area === "666") return false;
  if (area >= "900") return false;
  if (group === "00") return false;
  if (serial === "0000") return false;

  return true;
}
