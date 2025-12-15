export function decryptVigenere(ciphertext: string, key: string): string {
  if (!ciphertext || !key) return "";

  const cleanKey = key.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (!cleanKey) return ciphertext; // No valid key characters

  let result = "";
  let keyIndex = 0;

  for (let i = 0; i < ciphertext.length; i++) {
    const char = ciphertext[i];

    if (/[A-Za-z]/.test(char)) {
      const isUpper = char === char.toUpperCase();
      const shift = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
      const charCode = char.toUpperCase().charCodeAt(0);

      // Decrypt: (C - K + 26) % 26
      let decryptedCode = (charCode - 65 - shift + 26) % 26;
      decryptedCode += 65;

      result += isUpper ? String.fromCharCode(decryptedCode) : String.fromCharCode(decryptedCode).toLowerCase();

      keyIndex++;
    } else {
      result += char;
    }
  }

  return result;
}
