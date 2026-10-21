import { WordResult, MeaningGroup, PartOfSpeech, SynonymItem } from '../types/dictionary';
import { formatPhonetic } from './pronunciation-service';

export function tagToPos(tag: string): PartOfSpeech {
  const t = tag.toLowerCase().trim();
  if (t === 'n' || t === 'noun') return 'noun';
  if (t === 'v' || t === 'verb') return 'verb';
  if (t === 'adj' || t === 'adjective') return 'adjective';
  if (t === 'adv' || t === 'adverb') return 'adverb';
  if (t === 'prep' || t === 'preposition') return 'preposition';
  if (t === 'conj' || t === 'conjunction') return 'conjunction';
  if (t === 'pron' || t === 'pronoun') return 'pronoun';
  if (t === 'interj' || t === 'interjection') return 'interjection';
  return 'other';
}

interface DatamuseWordEntry {
  word: string;
  score?: number;
  numSyllables?: number;
  tags?: string[];
  defs?: string[];
}

interface DatamuseRelEntry {
  word: string;
  score?: number;
  tags?: string[];
}

/**
 * Fetches word definitions and phonetics from Datamuse API.
 */
export async function fetchOnlineDefinition(word: string): Promise<WordResult | null> {
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(cleanWord)}&md=dprs&max=1`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as DatamuseWordEntry[];
    if (!data || data.length === 0 || data[0].word.toLowerCase() !== cleanWord) {
      return null;
    }

    const entry = data[0];
    const rawDefs = entry.defs || [];

    // Extract pronunciation
    let rawPhonetic: string | undefined;
    if (entry.tags) {
      const pronTag = entry.tags.find((t) => t.startsWith('pron:'));
      if (pronTag) {
        rawPhonetic = formatPhonetic(pronTag);
      }
    }

    // Group definitions by part of speech
    const groupsMap = new Map<PartOfSpeech, string[]>();

    for (const rawDef of rawDefs) {
      const tabIdx = rawDef.indexOf('\t');
      let pos: PartOfSpeech = 'noun';
      let defText = rawDef;

      if (tabIdx !== -1) {
        const posTag = rawDef.slice(0, tabIdx);
        pos = tagToPos(posTag);
        defText = rawDef.slice(tabIdx + 1).trim();
      }

      if (!groupsMap.has(pos)) {
        groupsMap.set(pos, []);
      }
      groupsMap.get(pos)!.push(defText);
    }

    // Also fetch quick synonyms and antonyms in parallel
    const [synonyms, antonyms] = await Promise.all([
      fetchOnlineSynonyms(cleanWord),
      fetchOnlineAntonyms(cleanWord),
    ]);

    const meanings: MeaningGroup[] = [];
    for (const [pos, definitions] of groupsMap.entries()) {
      meanings.push({
        partOfSpeech: pos,
        definitions,
        examples: [],
        synonyms: synonyms.slice(0, 10).map((s) => s.word),
        antonyms: antonyms.slice(0, 5).map((a) => a.word),
      });
    }

    if (meanings.length === 0 && rawDefs.length === 0 && synonyms.length === 0) {
      return null;
    }

    return {
      word: cleanWord,
      phonetic: rawPhonetic,
      syllables: entry.numSyllables,
      meanings,
      allSynonyms: synonyms.map((s) => s.word),
      allAntonyms: antonyms.map((a) => a.word),
      source: 'online',
    };
  } catch {
    return null;
  }
}

/**
 * Fetches ranked synonyms and similar meanings from Datamuse.
 */
export async function fetchOnlineSynonyms(word: string): Promise<SynonymItem[]> {
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    // Query exact synonyms and means-like relations in parallel
    const [synRes, mlRes] = await Promise.allSettled([
      fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(cleanWord)}&max=30`, {
        signal: controller.signal,
      }).then((r) => r.json() as Promise<DatamuseRelEntry[]>),
      fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(cleanWord)}&max=30`, {
        signal: controller.signal,
      }).then((r) => r.json() as Promise<DatamuseRelEntry[]>),
    ]);
    clearTimeout(timeout);

    const items: SynonymItem[] = [];
    const seen = new Set<string>();

    if (synRes.status === 'fulfilled' && Array.isArray(synRes.value)) {
      for (const item of synRes.value) {
        const w = item.word.toLowerCase().trim();
        if (w !== cleanWord && !seen.has(w)) {
          seen.add(w);
          let pos: PartOfSpeech | undefined;
          if (item.tags) {
            const posTag = item.tags.find((t) => ['n', 'v', 'adj', 'adv'].includes(t));
            if (posTag) pos = tagToPos(posTag);
          }
          items.push({
            word: w,
            score: item.score,
            partOfSpeech: pos,
            relationType: 'synonym',
          });
        }
      }
    }

    if (mlRes.status === 'fulfilled' && Array.isArray(mlRes.value)) {
      for (const item of mlRes.value) {
        const w = item.word.toLowerCase().trim();
        if (w !== cleanWord && !seen.has(w)) {
          seen.add(w);
          let pos: PartOfSpeech | undefined;
          if (item.tags) {
            const posTag = item.tags.find((t) => ['n', 'v', 'adj', 'adv'].includes(t));
            if (posTag) pos = tagToPos(posTag);
          }
          items.push({
            word: w,
            score: item.score,
            partOfSpeech: pos,
            relationType: 'related',
          });
        }
      }
    }

    return items;
  } catch {
    return [];
  }
}

/**
 * Fetches antonyms from Datamuse.
 */
export async function fetchOnlineAntonyms(word: string): Promise<SynonymItem[]> {
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://api.datamuse.com/words?rel_ant=${encodeURIComponent(cleanWord)}&max=20`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = (await res.json()) as DatamuseRelEntry[];
    return data
      .filter((d) => d.word.toLowerCase() !== cleanWord)
      .map((d) => ({
        word: d.word.toLowerCase(),
        score: d.score,
        relationType: 'antonym' as const,
      }));
  } catch {
    return [];
  }
}
