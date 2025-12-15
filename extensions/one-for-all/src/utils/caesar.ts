export enum AlphabetType {
  English = "english",
  EnglishDigits = "english_digits",
  Latin = "latin",
  ASCII = "ascii",
  Custom = "custom",
}

const Alphabets = {
  [AlphabetType.English]: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  [AlphabetType.EnglishDigits]: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  [AlphabetType.Latin]: "ABCDEFGHIKLMNOPQRSTVXYZ",
};

export function caesarCipher(text: string, shift: number, type: AlphabetType, customAlphabet = ""): string {
  if (!text) return "";

  // Normalize shift to positive
  let safeShift = shift;

  if (type === AlphabetType.ASCII) {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      // ASCII size is 128
      let newCode = (charCode + safeShift) % 128;
      if (newCode < 0) newCode += 128;
      result += String.fromCharCode(newCode);
    }
    return result;
  }

  let alphabet = "";
  if (type === AlphabetType.Custom) {
    if (!customAlphabet) return text;
    alphabet = customAlphabet;
  } else {
    alphabet = Alphabets[type];
  }

  if (!alphabet) return text;

  const alphabetLen = alphabet.length;
  // Ensure strict positive mod
  safeShift = safeShift % alphabetLen;
  if (safeShift < 0) safeShift += alphabetLen;

  let result = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Check if char is in alphabet
    // For English/Latin: Handle case preservation?
    // Standard logic: If alphabet is "A-Z", it usually implies case-insensitivity mapping
    // But for "English + Digits" or "Custom", mixing upper/lower might be weird if alphabet is just upper.

    // Let's deduce case handling:
    // If alphabet has ONLY uppercase (like our defaults), we try to preserve case for English/Latin.
    // Check if char is lower, convert to upper -> find index -> shift -> convert back to lower.

    const isLower = char === char.toLowerCase() && char !== char.toUpperCase();
    const targetChar = isLower ? char.toUpperCase() : char;

    const idx = alphabet.indexOf(targetChar);

    if (idx !== -1) {
      const newIdx = (idx + safeShift) % alphabetLen;
      const newChar = alphabet[newIdx];
      result += isLower ? newChar.toLowerCase() : newChar;
    } else {
      // Character not in alphabet
      result += char;
    }
  }

  return result;
}
