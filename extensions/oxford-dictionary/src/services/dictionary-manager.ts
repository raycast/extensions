import {
  WordResult,
  ThesaurusResult,
  SynonymItem,
  ExtensionPreferences,
  MeaningGroup,
} from '../types/dictionary';
import { lookupOffline, getOfflineSynonymsList } from './offline-dictionary';
import {
  fetchOnlineDefinition,
  fetchOnlineSynonyms,
  fetchOnlineAntonyms,
} from './online-dictionary';
import { lookupMacOxford } from './oxford-macos-service';

// Fallback in-memory cache if Raycast Cache is unavailable in test runner
class SimpleCache {
  private store = new Map<string, string>();

  get(key: string): string | undefined {
    return this.store.get(key);
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }
}

let wordCache: { get: (k: string) => string | undefined; set: (k: string, v: string) => void };
let synCache: { get: (k: string) => string | undefined; set: (k: string, v: string) => void };

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Cache } = require('@raycast/api');
  wordCache = new Cache({ namespace: 'dict-words' });
  synCache = new Cache({ namespace: 'dict-synonyms' });
} catch {
  wordCache = new SimpleCache();
  synCache = new SimpleCache();
}

/**
 * Searches the meaning of a word using our hybrid engine:
 * 1. Cache -> instant return
 * 2. macOS Oxford -> if enabled and on macOS
 * 3. Offline WordNet & MyThes -> instant baseline
 * 4. Online Datamuse -> enriches phonetics, syllables, and modern definitions
 */
export async function searchWord(
  query: string,
  preferences: ExtensionPreferences = {}
): Promise<WordResult | null> {
  const clean = query.trim().toLowerCase();
  if (!clean) return null;

  // 1. Check cache
  const cached = wordCache.get(clean);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as WordResult;
      if (!parsed.originalSource) {
        parsed.originalSource = parsed.source !== 'cache' ? (parsed.source as any) : 'online';
      }
      parsed.source = 'cache';
      return parsed;
    } catch {
      // ignore
    }
  }

  // 2. Try macOS Oxford Native bridge if enabled
  if (preferences.preferOxford && process.platform === 'darwin') {
    const oxfordResult = await lookupMacOxford(clean);
    if (oxfordResult && oxfordResult.meanings.length > 0) {
      oxfordResult.originalSource = 'oxford';
      wordCache.set(clean, JSON.stringify(oxfordResult));
      return oxfordResult;
    }
  }

  // 3. Baseline offline lookup
  const offlineResult = await lookupOffline(clean);
  if (offlineResult) {
    offlineResult.originalSource = 'offline';
  }

  // If force offline, return offline result directly
  if (preferences.offlineOnly) {
    if (offlineResult) {
      wordCache.set(clean, JSON.stringify(offlineResult));
    }
    return offlineResult;
  }

  // 4. Online enrichment
  try {
    const onlineResult = await fetchOnlineDefinition(clean);

    if (!offlineResult && !onlineResult) {
      return null;
    }

    if (!offlineResult && onlineResult) {
      onlineResult.originalSource = 'online';
      wordCache.set(clean, JSON.stringify(onlineResult));
      return onlineResult;
    }

    if (offlineResult && !onlineResult) {
      offlineResult.originalSource = 'offline';
      wordCache.set(clean, JSON.stringify(offlineResult));
      return offlineResult;
    }

    // Merge offline and online data for best results
    const merged = mergeResults(offlineResult!, onlineResult!);
    merged.originalSource = 'online';
    wordCache.set(clean, JSON.stringify(merged));
    return merged;
  } catch {
    if (offlineResult) {
      offlineResult.originalSource = 'offline';
      wordCache.set(clean, JSON.stringify(offlineResult));
    }
    return offlineResult;
  }
}

function mergeResults(offline: WordResult, online: WordResult): WordResult {
  const mergedMeanings: MeaningGroup[] = [];

  const posSet = new Set([
    ...offline.meanings.map((m) => m.partOfSpeech),
    ...online.meanings.map((m) => m.partOfSpeech),
  ]);

  for (const pos of posSet) {
    const offM = offline.meanings.find((m) => m.partOfSpeech === pos);
    const onM = online.meanings.find((m) => m.partOfSpeech === pos);

    const definitions = Array.from(
      new Set([...(onM?.definitions || []), ...(offM?.definitions || [])])
    );
    const examples = Array.from(
      new Set([...(offM?.examples || []), ...(onM?.examples || [])])
    );
    const synonyms = Array.from(
      new Set([...(offM?.synonyms || []), ...(onM?.synonyms || [])])
    );
    const antonyms = Array.from(
      new Set([...(offM?.antonyms || []), ...(onM?.antonyms || [])])
    );

    mergedMeanings.push({
      partOfSpeech: pos,
      definitions,
      examples,
      synonyms,
      antonyms,
    });
  }

  const allSynonyms = Array.from(
    new Set([...offline.allSynonyms, ...online.allSynonyms])
  );
  const allAntonyms = Array.from(
    new Set([...offline.allAntonyms, ...online.allAntonyms])
  );

  return {
    word: offline.word,
    phonetic: online.phonetic || offline.phonetic,
    syllables: online.syllables || offline.syllables,
    meanings: mergedMeanings,
    allSynonyms,
    allAntonyms,
    source: 'online',
    originalSource: 'online',
  };
}

/**
 * Searches synonyms and antonyms for a word:
 * Combines offline thesaurus + online Datamuse.
 */
export async function searchThesaurus(
  query: string,
  preferences: ExtensionPreferences = {}
): Promise<ThesaurusResult> {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    return { targetWord: '', synonyms: [], antonyms: [], source: 'offline' };
  }

  // Check cache
  const cached = synCache.get(clean);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as ThesaurusResult;
      parsed.source = 'cache';
      return parsed;
    } catch {
      // ignore
    }
  }

  // 1. Offline list
  const offlineItems = getOfflineSynonymsList(clean);

  if (preferences.offlineOnly) {
    const res: ThesaurusResult = {
      targetWord: clean,
      synonyms: offlineItems,
      antonyms: [],
      source: 'offline',
    };
    synCache.set(clean, JSON.stringify(res));
    return res;
  }

  // 2. Online enrichment
  try {
    const [onlineSyns, onlineAnts] = await Promise.all([
      fetchOnlineSynonyms(clean),
      fetchOnlineAntonyms(clean),
    ]);

    const seenSyns = new Set<string>();
    const mergedSyns: SynonymItem[] = [];

    // Prioritize online ranked synonyms, then supplement with offline
    for (const item of onlineSyns) {
      if (!seenSyns.has(item.word)) {
        seenSyns.add(item.word);
        mergedSyns.push(item);
      }
    }

    for (const item of offlineItems) {
      if (!seenSyns.has(item.word)) {
        seenSyns.add(item.word);
        mergedSyns.push(item);
      }
    }

    const res: ThesaurusResult = {
      targetWord: clean,
      synonyms: mergedSyns,
      antonyms: onlineAnts,
      source: 'online',
    };

    synCache.set(clean, JSON.stringify(res));
    return res;
  } catch {
    const res: ThesaurusResult = {
      targetWord: clean,
      synonyms: offlineItems,
      antonyms: [],
      source: 'offline',
    };
    synCache.set(clean, JSON.stringify(res));
    return res;
  }
}
