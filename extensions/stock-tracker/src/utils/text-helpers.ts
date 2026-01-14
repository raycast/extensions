/**
 * Converts Turkish characters to their English equivalents
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeTurkishChars(text: string): string {
  const turkishToEnglish: Record<string, string> = {
    ı: "i",
    İ: "I",
    ş: "s",
    Ş: "S",
    ğ: "g",
    Ğ: "G",
    ü: "u",
    Ü: "U",
    ö: "o",
    Ö: "O",
    ç: "c",
    Ç: "C",
  };

  return text.replace(/[ıİşŞğĞüÜöÖçÇ]/g, (char) => turkishToEnglish[char] || char);
}
