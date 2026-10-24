import { WordResult, SynonymItem } from '../types/dictionary';
import {
  lookupOfflineZeroRam,
  getOfflineSynonymsZeroRam,
} from './fast-wordnet-reader';
import { NICHE_VOCABULARY } from '../data/niche-vocabulary';

/**
 * Ultra-low memory offline dictionary lookup.
 * Directly reads WordNet disk indexes with binary search (< 50 KB RAM),
 * with fallback to the curated Niche Vocabulary bank.
 */
export async function lookupOffline(word: string): Promise<WordResult | null> {
  const base = await lookupOfflineZeroRam(word);
  if (base) return base;

  const clean = word.toLowerCase().trim();
  const niche = NICHE_VOCABULARY.find((e) => e.word.toLowerCase() === clean);
  if (niche) {
    return {
      word: niche.word,
      source: 'offline',
      meanings: [
        {
          partOfSpeech: niche.partOfSpeech,
          definitions: [niche.definition],
          examples: niche.example ? [niche.example] : [],
          synonyms: niche.concepts.slice(0, 8),
          antonyms: [],
        },
      ],
      allSynonyms: niche.concepts.slice(0, 8),
      allAntonyms: [],
    };
  }

  return null;
}

/**
 * Ultra-low memory offline synonym search.
 */
export function getOfflineSynonymsList(word: string): SynonymItem[] {
  return getOfflineSynonymsZeroRam(word);
}
