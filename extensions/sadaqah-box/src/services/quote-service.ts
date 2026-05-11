/**
 * Quote Service
 *
 * Provides random Quranic verses (ayahs) and Hadith about Sadaqah.
 * Data is loaded from JSON file.
 */

import quotesData from "../data/quotes.json";
import type { Ayah, Hadith, QuoteResult, QuoteType } from "../data/quotes";

// Typed data from JSON
const quotes = quotesData as { ayahs: Ayah[]; hadiths: Hadith[] };

/**
 * Service for retrieving random quotes (ayahs and hadiths) about Sadaqah
 */
export class QuoteService {
  private static instance: QuoteService;
  private ayahs: Ayah[];
  private hadiths: Hadith[];

  constructor() {
    this.ayahs = quotes.ayahs;
    this.hadiths = quotes.hadiths;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): QuoteService {
    if (!QuoteService.instance) {
      QuoteService.instance = new QuoteService();
    }
    return QuoteService.instance;
  }

  /**
   * Get all ayahs
   */
  getAllAyahs(): Ayah[] {
    return [...this.ayahs];
  }

  /**
   * Get all hadiths
   */
  getAllHadiths(): Hadith[] {
    return [...this.hadiths];
  }

  /**
   * Get a random ayah
   */
  getRandomAyah(): Ayah {
    if (this.ayahs.length === 0) {
      throw new Error("No ayahs available");
    }
    const randomIndex = Math.floor(Math.random() * this.ayahs.length);
    return this.ayahs[randomIndex]!;
  }

  /**
   * Get a random hadith
   */
  getRandomHadith(): Hadith {
    if (this.hadiths.length === 0) {
      throw new Error("No hadiths available");
    }
    const randomIndex = Math.floor(Math.random() * this.hadiths.length);
    return this.hadiths[randomIndex]!;
  }

  /**
   * Get a random quote (ayah or hadith)
   * @param type - Type of quote: 'ayah', 'hadith', or 'any' (default)
   */
  getRandomQuote(type: QuoteType = "any"): QuoteResult {
    if (type === "ayah") {
      return { type: "ayah", data: this.getRandomAyah() };
    }
    if (type === "hadith") {
      return { type: "hadith", data: this.getRandomHadith() };
    }

    // 'any' - randomly choose between ayah and hadith
    const isAyah = Math.random() < 0.5;
    if (isAyah) {
      return { type: "ayah", data: this.getRandomAyah() };
    }
    return { type: "hadith", data: this.getRandomHadith() };
  }

  /**
   * Get total count of ayahs
   */
  getAyahCount(): number {
    return this.ayahs.length;
  }

  /**
   * Get total count of hadiths
   */
  getHadithCount(): number {
    return this.hadiths.length;
  }

  /**
   * Get total count of all quotes
   */
  getTotalCount(): number {
    return this.ayahs.length + this.hadiths.length;
  }
}

/**
 * Factory function for creating QuoteService instance
 */
export function getQuoteService(): QuoteService {
  return QuoteService.getInstance();
}
