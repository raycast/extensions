import { Language, languages } from "../data";

export function detectLanguage(text: string, threshold: number): Language | null {
  const charFrequencies: { [key: string]: number } = {};

  for (const char of text.toLowerCase()) {
    charFrequencies[char] = (charFrequencies[char] || 0) + 1;
  }

  const languageScores: { [key in Language]: number } = { eng: 0, ukr: 0 };

  for (const lang of Object.keys(languages) as Language[]) {
    for (const char of Object.keys(charFrequencies)) {
      if (languages[lang].kbdKeys.includes(char)) {
        const normalizedFrequency = charFrequencies[char] / text.length;
        languageScores[lang] += normalizedFrequency;
      }
    }
  }

  const totalScore = languageScores.eng + languageScores.ukr;

  if (totalScore === 0) return null;

  const engScore = languageScores.eng / totalScore;
  const ukrScore = languageScores.ukr / totalScore;

  if (engScore > threshold) {
    return "eng";
  } else if (ukrScore > threshold) {
    return "ukr";
  } else {
    return null;
  }
}
