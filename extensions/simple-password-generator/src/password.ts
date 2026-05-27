import { WORDS } from "./words";

if (WORDS.length !== 7776) {
  console.warn(
    `Word list has ${WORDS.length} words (expected 7776); entropy estimates may be inflated.`,
  );
}

interface PasswordOptions {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useDigits: boolean;
  useSymbols: boolean;
  useAmbiguous: boolean;
  minUppercase?: number;
  minLowercase?: number;
  minDigits?: number;
  minSymbols?: number;
  avoidRepeated?: boolean;
}

interface PassphraseOptions {
  wordCount: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

interface PinOptions {
  length: number;
}

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*";
const AMBIGUOUS = "0O1lI|";

function pick<T>(items: readonly T[]): T {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return items[array[0] % items.length];
}

function charsetSize(options: PasswordOptions): number {
  let size = 0;
  let ambiguousInSet = 0;

  if (options.useUppercase) {
    size += 26;
    ambiguousInSet += [...UPPERCASE].filter((c) =>
      AMBIGUOUS.includes(c),
    ).length;
  }
  if (options.useLowercase) {
    size += 26;
    ambiguousInSet += [...LOWERCASE].filter((c) =>
      AMBIGUOUS.includes(c),
    ).length;
  }
  if (options.useDigits) {
    size += 10;
    ambiguousInSet += [...DIGITS].filter((c) => AMBIGUOUS.includes(c)).length;
  }
  if (options.useSymbols) {
    size += SYMBOLS.length;
    ambiguousInSet += [...SYMBOLS].filter((c) => AMBIGUOUS.includes(c)).length;
  }

  if (!options.useAmbiguous) {
    size -= ambiguousInSet;
  }

  return Math.max(size, 1);
}

function estimatePasswordEntropy(options: PasswordOptions): number {
  const cs = charsetSize(options);
  return Math.round(options.length * Math.log2(cs) * 10) / 10;
}

function estimatePassphraseEntropy(options: PassphraseOptions): number {
  let bits = options.wordCount * Math.log2(7776);
  if (options.includeNumber) {
    bits += Math.log2(100);
  }
  return Math.round(bits * 10) / 10;
}

function estimatePinEntropy(options: PinOptions): number {
  return Math.round(options.length * Math.log2(10) * 10) / 10;
}

function shuffle(arr: string[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const rand = new Uint32Array(1);
    crypto.getRandomValues(rand);
    const j = rand[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function avoidRepeatedCharacters(s: string, charset: string): string {
  const chars = s.split("");
  for (let i = 1; i < chars.length; i++) {
    let attempts = 0;
    while (chars[i] === chars[i - 1] && attempts < 10) {
      chars[i] = pick(charset.split(""));
      attempts++;
    }
  }
  return chars.join("");
}

function stripAmbiguous(set: string): string {
  let s = set;
  for (const char of AMBIGUOUS) {
    s = s.replaceAll(char, "");
  }
  return s;
}

function generatePassword(options: PasswordOptions): string {
  const setDefs: Array<{ chars: string; min: number }> = [];

  const addSet = (enabled: boolean, chars: string, min: number) => {
    if (!enabled) return;
    const cleaned = options.useAmbiguous ? chars : stripAmbiguous(chars);
    if (cleaned.length > 0) setDefs.push({ chars: cleaned, min });
  };

  addSet(options.useUppercase, UPPERCASE, options.minUppercase ?? 1);
  addSet(options.useLowercase, LOWERCASE, options.minLowercase ?? 1);
  addSet(options.useDigits, DIGITS, options.minDigits ?? 1);
  addSet(options.useSymbols, SYMBOLS, options.minSymbols ?? 1);

  if (setDefs.length === 0) {
    setDefs.push({ chars: LOWERCASE + DIGITS, min: 0 });
  }

  const charset = setDefs.map((d) => d.chars).join("");
  const passwordChars: string[] = [];

  // Seed with minimum character counts
  const totalMin = setDefs.reduce((sum, d) => sum + d.min, 0);
  const effectiveMin = Math.min(totalMin, options.length);

  if (effectiveMin > 0) {
    for (const { chars, min } of setDefs) {
      if (min > 0 && passwordChars.length < options.length) {
        const count = Math.min(min, options.length - passwordChars.length);
        const array = new Uint32Array(count);
        crypto.getRandomValues(array);
        for (let i = 0; i < count; i++) {
          passwordChars.push(chars[array[i] % chars.length]);
        }
      }
    }
  } else if (options.length >= setDefs.length && setDefs.length > 0) {
    // Legacy fallback: at least one from each set when no mins specified
    for (const { chars } of setDefs) {
      passwordChars.push(pick(chars.split("")));
    }
  }

  // Fill remaining positions
  const remainingLength = options.length - passwordChars.length;
  if (remainingLength > 0) {
    const array = new Uint32Array(remainingLength);
    crypto.getRandomValues(array);
    for (let i = 0; i < remainingLength; i++) {
      passwordChars.push(charset[array[i] % charset.length]);
    }
  }

  let result = shuffle(passwordChars).join("");

  if (options.avoidRepeated) {
    result = avoidRepeatedCharacters(result, charset);
  }

  return result;
}

function generatePassphrase(options: PassphraseOptions): string {
  const words: string[] = [];
  for (let i = 0; i < options.wordCount; i++) {
    let word = pick(WORDS);
    if (options.capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    words.push(word);
  }

  let passphrase = words.join(options.separator);

  if (options.includeNumber) {
    const digit = new Uint32Array(1);
    crypto.getRandomValues(digit);
    passphrase += options.separator + (digit[0] % 100);
  }

  return passphrase;
}

function generatePin(options: PinOptions): string {
  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);

  let pin = "";
  for (let i = 0; i < options.length; i++) {
    pin += DIGITS[array[i] % 10];
  }

  return pin;
}

export {
  PasswordOptions,
  PassphraseOptions,
  PinOptions,
  UPPERCASE,
  LOWERCASE,
  DIGITS,
  SYMBOLS,
  AMBIGUOUS,
  pick,
  charsetSize,
  estimatePasswordEntropy,
  estimatePassphraseEntropy,
  estimatePinEntropy,
  shuffle,
  generatePassword,
  generatePassphrase,
  generatePin,
};
