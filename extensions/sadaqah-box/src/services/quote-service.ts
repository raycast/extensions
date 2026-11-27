/**
 * Quote Service
 * Provides random Quranic verses (ayahs) and Hadith about Sadaqah
 */

import quotesData from "../data/quotes.json";
import type { Ayah, Hadith, QuoteResult, QuoteType } from "../data/quotes";

const quotes = quotesData as { ayahs: Ayah[]; hadiths: Hadith[] };

function pickRandom<T>(items: T[], emptyMessage: string): T {
  if (items.length === 0) {
    throw new Error(emptyMessage);
  }
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex]!;
}

/**
 * Get a random Quranic verse (ayah) about Sadaqah
 */
export function getRandomAyah(): Ayah {
  return pickRandom(quotes.ayahs, "No ayahs available");
}

/**
 * Get a random Hadith about Sadaqah
 */
export function getRandomHadith(): Hadith {
  return pickRandom(quotes.hadiths, "No hadiths available");
}

/**
 * Get a random quote (ayah or hadith)
 */
export function getRandomQuote(type: QuoteType = "any"): QuoteResult {
  if (type === "ayah") {
    return { type: "ayah", data: getRandomAyah() };
  }
  if (type === "hadith") {
    return { type: "hadith", data: getRandomHadith() };
  }

  return Math.random() < 0.5 ? { type: "ayah", data: getRandomAyah() } : { type: "hadith", data: getRandomHadith() };
}
