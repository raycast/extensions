import type { LanguageConfig } from "./languageConfig";

export interface WordScore {
  word: string;
  score: number;
}

export class WordScorer {
  private config: LanguageConfig;

  constructor(config: LanguageConfig) {
    this.config = config;
  }
  /**
   * Calculate information value of a word based on remaining possibilities
   * Uses entropy to measure how much information a word can provide
   */
  calculateInformationScore(word: string, candidateWords: string[]): number {
    if (candidateWords.length <= 1) return 0;

    // Group candidate words by potential feedback patterns
    const feedbackGroups = new Map<string, number>();

    for (const candidate of candidateWords) {
      const pattern = this.getFeedbackPattern(word, candidate);
      feedbackGroups.set(pattern, (feedbackGroups.get(pattern) || 0) + 1);
    }

    // Calculate entropy (information value)
    let entropy = 0;
    const total = candidateWords.length;

    for (const count of feedbackGroups.values()) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Calculate frequency score based on letter frequency
   */
  calculateFrequencyScore(word: string): number {
    let score = 0;
    const letterCounts = new Map<string, number>();

    // Count unique letters (duplicate letters reduce score)
    for (const letter of word) {
      letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
    }

    for (const [letter, count] of letterCounts) {
      const frequency = this.config.letterFrequency[letter.toLowerCase()] || 0;
      // Penalize repeated letters
      score += frequency / count;
    }

    return score;
  }

  /**
   * Calculate position-based score (common letters in common positions)
   */
  calculatePositionScore(word: string): number {
    const { commonFirstLetters, commonLastLetters, firstLetterBonus, lastLetterBonus } = this.config.positionScoring;

    let score = 0;

    // Bonus for common first letter
    if (commonFirstLetters.includes(word[0].toLowerCase())) {
      score += firstLetterBonus;
    }

    // Bonus for common last letter
    if (commonLastLetters.includes(word[word.length - 1].toLowerCase())) {
      score += lastLetterBonus;
    }

    return score;
  }

  /**
   * Generate feedback pattern for two words (what feedback word1 would get if word2 was the answer)
   */
  private getFeedbackPattern(guess: string, answer: string): string {
    const pattern: string[] = [];
    const answerLetters = answer.split("");
    const usedPositions = new Set<number>();

    // First pass: mark correct positions
    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === answer[i]) {
        pattern[i] = "C";
        usedPositions.add(i);
      }
    }

    // Second pass: mark wrong positions and not-in-word
    for (let i = 0; i < guess.length; i++) {
      if (pattern[i] === "C") continue;

      const letter = guess[i];
      let foundAt = -1;

      for (let j = 0; j < answerLetters.length; j++) {
        if (!usedPositions.has(j) && answerLetters[j] === letter) {
          foundAt = j;
          break;
        }
      }

      if (foundAt >= 0) {
        pattern[i] = "W"; // wrong position
        usedPositions.add(foundAt);
      } else {
        pattern[i] = "N"; // not in word
      }
    }

    return pattern.join("");
  }
}
