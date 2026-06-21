import { getCached, setCached } from "../utils/cache";
import { fetchSynonyms } from "./datamuse";
import { getLocalDefinitions } from "./localDefinitions";
import { findTechEntry } from "./techDictionary";
import { translateDefinitions } from "./translation";
import { Definition, PhoneticVariant, WordResult } from "../types/word";

type DictionaryApiEntry = {
  word: string;
  phonetic?: string;
  phonetics?: Array<{
    text?: string;
    audio?: string;
  }>;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{
      definition?: string;
      example?: string;
      synonyms?: string[];
    }>;
    synonyms?: string[];
  }>;
};

type DictionaryFetchResult = {
  entries: DictionaryApiEntry[];
  cacheable: boolean;
};

type NormalizedResult = {
  result: WordResult;
  cacheable: boolean;
};

const MAX_DEFINITIONS = 8;
const MAX_EXAMPLES = 5;

export async function lookupWord(query: string, signal?: AbortSignal): Promise<WordResult> {
  const normalizedQuery = normalizeQuery(query);
  const cacheKey = `word:v3:${normalizedQuery}`;
  const cached = await getCached<WordResult>(cacheKey);
  if (cached) {
    return { ...cached, source: "cache" };
  }

  const [dictionary, synonyms] = await Promise.all([
    fetchDictionaryEntries(normalizedQuery, signal),
    fetchSynonymsSafely(normalizedQuery, signal),
  ]);
  const { result, cacheable } = await normalizeEntries(normalizedQuery, dictionary.entries, synonyms, signal);
  if (dictionary.cacheable && cacheable) {
    await setCached(cacheKey, result);
  }
  return result;
}

async function fetchDictionaryEntries(query: string, signal?: AbortSignal): Promise<DictionaryFetchResult> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`, {
      signal,
    });
    if (response.status === 404) return { entries: [], cacheable: true };
    if (!response.ok) return { entries: [], cacheable: false };
    return { entries: (await response.json()) as DictionaryApiEntry[], cacheable: true };
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { entries: [], cacheable: false };
  }
}

async function fetchSynonymsSafely(query: string, signal?: AbortSignal): Promise<string[]> {
  try {
    return await fetchSynonyms(query, signal);
  } catch (error) {
    if (isAbortError(error)) throw error;
    return [];
  }
}

async function normalizeEntries(
  query: string,
  entries: DictionaryApiEntry[],
  synonyms: string[],
  signal?: AbortSignal,
): Promise<NormalizedResult> {
  const firstEntry = entries[0];
  const word = firstEntry?.word ?? query;
  const translation = await translateDefinitions(collectDefinitions(entries), signal);
  const definitions = translation.definitions;
  const apiSynonyms = collectSynonyms(entries);
  const mergedSynonyms = unique([...synonyms, ...apiSynonyms]).slice(0, 10);
  const techEntry = findTechEntry(query);
  const localDefinitions = getLocalDefinitions(query);

  return {
    result: {
      query,
      word,
      syllables: splitSyllables(word),
      pronunciationHint: getPronunciationHint(word),
      phonetics: collectPhonetics(entries),
      localDefinitions: techEntry ? unique([techEntry.meaning, ...localDefinitions]) : localDefinitions,
      definitions,
      examples: definitions.filter((definition) => definition.example).slice(0, MAX_EXAMPLES),
      inflections: getInflections(word),
      collocations: getCollocations(query),
      synonyms: mergedSynonyms,
      techEntry,
      source: entries.length > 0 ? "remote" : "local",
      updatedAt: new Date().toISOString(),
    },
    cacheable: translation.cacheable,
  };
}

function collectDefinitions(entries: DictionaryApiEntry[]): Definition[] {
  const definitions: Definition[] = [];

  for (const entry of entries) {
    for (const meaning of entry.meanings ?? []) {
      for (const item of meaning.definitions ?? []) {
        if (!item.definition) continue;
        definitions.push({
          partOfSpeech: meaning.partOfSpeech ?? "unknown",
          english: item.definition,
          ...(item.example ? { example: item.example } : {}),
        });
      }
    }
  }

  return definitions.slice(0, MAX_DEFINITIONS);
}

function collectSynonyms(entries: DictionaryApiEntry[]): string[] {
  return unique(
    entries.flatMap((entry) =>
      (entry.meanings ?? []).flatMap((meaning) => [
        ...(meaning.synonyms ?? []),
        ...(meaning.definitions ?? []).flatMap((definition) => definition.synonyms ?? []),
      ]),
    ),
  );
}

function collectPhonetics(entries: DictionaryApiEntry[]): PhoneticVariant[] {
  const allPhonetics = entries.flatMap((entry) => entry.phonetics ?? []);
  const variants: PhoneticVariant[] = [];

  const us =
    allPhonetics.find((phonetic) => phonetic.audio?.toLowerCase().includes("-us")) ??
    allPhonetics.find((phonetic) => phonetic.audio);
  const uk = allPhonetics.find((phonetic) => phonetic.audio?.toLowerCase().includes("-uk"));
  const textFallback = entries.find((entry) => entry.phonetic)?.phonetic;

  if (us?.text || us?.audio || textFallback) {
    variants.push({
      region: "US",
      ...((us?.text ?? textFallback) ? { text: us?.text ?? textFallback } : {}),
      ...(us?.audio ? { audioUrl: us.audio } : {}),
    });
  }

  if (uk?.text || uk?.audio) {
    variants.push({ region: "UK", ...(uk.text ? { text: uk.text } : {}), ...(uk.audio ? { audioUrl: uk.audio } : {}) });
  }

  if (variants.length === 0 && allPhonetics[0]) {
    const first = allPhonetics[0];
    variants.push({
      region: "Other",
      ...(first.text ? { text: first.text } : {}),
      ...(first.audio ? { audioUrl: first.audio } : {}),
    });
  }

  return variants;
}

function getInflections(word: string) {
  const normalizedWord = word.toLowerCase();
  if (!isSingleWord(normalizedWord)) {
    return { base: normalizedWord };
  }

  if (normalizedWord.endsWith("ied")) {
    const base = `${normalizedWord.slice(0, -3)}y`;
    return {
      base,
      past: normalizedWord,
      pastParticiple: normalizedWord,
      presentParticiple: `${base.slice(0, -1)}ying`,
    };
  }

  if (normalizedWord.endsWith("ing")) {
    return { base: normalizedWord, presentParticiple: normalizedWord };
  }

  if (normalizedWord.endsWith("e")) {
    return {
      base: normalizedWord,
      past: `${normalizedWord}d`,
      pastParticiple: `${normalizedWord}d`,
      presentParticiple: `${normalizedWord.slice(0, -1)}ing`,
    };
  }

  return {
    base: normalizedWord,
  };
}

function isSingleWord(word: string): boolean {
  return /^[a-z]+$/.test(word);
}

function getCollocations(query: string): string[] {
  const collocations: Record<string, string[]> = {
    deny: ["deny access", "deny permission", "deny responsibility", "deny allegations"],
    denied: ["access denied", "permission denied", "request denied", "connection denied"],
    maintain: ["maintain service", "maintain stability", "maintain compatibility", "maintain composure"],
    throughput: ["network throughput", "database throughput", "Kafka throughput", "query throughput"],
    latency: ["network latency", "query latency", "tail latency", "low latency"],
    resilience: ["system resilience", "operational resilience", "service resilience", "resilience testing"],
  };

  return collocations[query.toLowerCase()] ?? [];
}

function splitSyllables(word: string): string | undefined {
  const staticMap: Record<string, string> = {
    denied: "de·nied",
    deny: "de·ny",
    maintain: "main·tain",
    composure: "com·po·sure",
    provision: "pro·vi·sion",
    throughput: "through·put",
    latency: "la·ten·cy",
    resilience: "re·sil·ience",
    deprecated: "dep·re·cat·ed",
  };
  return staticMap[word.toLowerCase()];
}

function getPronunciationHint(word: string): string | undefined {
  const staticMap: Record<string, string> = {
    denied: "di-NYDE",
    maintain: "men-TAIN",
    composure: "kum-PO-zher",
    provision: "pruh-VI-zhuhn",
    throughput: "THROO-put",
    latency: "LAY-ten-see",
    resilience: "ri-ZIL-yens",
    deprecated: "DEP-ruh-kay-tid",
  };
  return staticMap[word.toLowerCase()];
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
