export type SupportedLanguage = "ru" | "en";

const CYRILLIC_LETTER = /[А-Яа-яЁё]/;
const LATIN_LETTER = /[A-Za-z]/;

export function detectLanguage(text: string): SupportedLanguage {
  const cyrillicLetters = text.match(/[А-Яа-яЁё]/g)?.length ?? 0;
  const latinLetters = text.match(/[A-Za-z]/g)?.length ?? 0;

  if (cyrillicLetters === latinLetters) {
    const firstCyrillicLetter = text.search(CYRILLIC_LETTER);
    const firstLatinLetter = text.search(LATIN_LETTER);

    return firstCyrillicLetter !== -1 &&
      (firstLatinLetter === -1 || firstCyrillicLetter < firstLatinLetter)
      ? "ru"
      : "en";
  }

  return cyrillicLetters > latinLetters ? "ru" : "en";
}

export function getTargetLanguage(
  sourceLanguage: SupportedLanguage,
): SupportedLanguage {
  return sourceLanguage === "ru" ? "en" : "ru";
}
