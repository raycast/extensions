export type RelevanceGroup = {
  label: string;
  words: string[];
};

export type ThesaurusEntry = {
  id: string;
  word: string;
  partOfSpeech?: string;
  definitions: string[];
  synonyms: string[];
  antonyms: string[];
  synonymGroups: RelevanceGroup[];
  antonymGroups: RelevanceGroup[];
};

export type ThesaurusMatch = "exact" | "related";

export type ThesaurusResult = { searched: string } & (
  { kind: "entries"; match: ThesaurusMatch; entries: ThesaurusEntry[] } | { kind: "suggestions"; suggestions: string[] }
);

const DATAMUSE = "https://api.datamuse.com";
const POS_NAMES: Record<string, string> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
};
const DEFINITION_LIMIT = 3;

type DatamuseWord = {
  word?: string;
  score?: number;
  tags?: string[];
  defs?: string[];
};

export function thesaurusPageUrl(word: string): string {
  return `https://en.wiktionary.org/wiki/${encodeURIComponent(word.replaceAll(" ", "_"))}`;
}

export async function fetchThesaurus(word: string): Promise<ThesaurusResult> {
  const query = word.trim();
  if (!query) {
    return { searched: query, kind: "entries", match: "exact", entries: [] };
  }

  const [head, synonyms, antonyms] = await Promise.all([
    datamuseWords({ sp: query, qe: "sp", md: "dp", max: "1" }),
    datamuseWords({ rel_syn: query, md: "p", max: "40" }),
    datamuseWords({ rel_ant: query, md: "p", max: "24" }),
  ]);

  const entries = buildEntries(query, head[0], synonyms, antonyms);
  if (entries.length > 0) {
    return { searched: query, kind: "entries", match: "exact", entries };
  }

  const suggestions = await datamuseWords({ s: query, max: "8" }, "/sug");
  const words = uniqueWords(
    suggestions.map((item) => item.word ?? "").filter((item) => item && !sameTerm(item, query)),
  );
  if (words.length === 0) {
    return { searched: query, kind: "entries", match: "exact", entries: [] };
  }

  return { searched: query, kind: "suggestions", suggestions: words };
}

function buildEntries(
  query: string,
  head: DatamuseWord | undefined,
  synonyms: DatamuseWord[],
  antonyms: DatamuseWord[],
): ThesaurusEntry[] {
  const definitions = definitionsByPos(head);
  const synonymWords = rankedWords(synonyms, query);
  const antonymWords = rankedWords(antonyms, query);
  const positions = senseOrder(head, definitions, [...synonymWords, ...antonymWords]);

  return positions.flatMap((pos) => {
    const entry = toEntry(
      query,
      pos,
      definitions.get(pos) ?? [],
      synonymWords.filter((word) => primaryPos(word.tags) === pos),
      antonymWords.filter((word) => primaryPos(word.tags) === pos),
    );
    return entry ? [entry] : [];
  });
}

function senseOrder(
  head: DatamuseWord | undefined,
  definitions: Map<string, string[]>,
  words: DatamuseWord[],
): string[] {
  const order: string[] = [];
  const add = (pos: string | undefined) => {
    if (pos && POS_NAMES[pos] && !order.includes(pos)) order.push(pos);
  };

  for (const tag of head?.tags ?? []) add(tag);
  for (const pos of definitions.keys()) add(pos);
  for (const word of words) add(primaryPos(word.tags));
  return order;
}

function toEntry(
  query: string,
  pos: string | undefined,
  definitions: string[],
  synonyms: DatamuseWord[],
  antonyms: DatamuseWord[],
): ThesaurusEntry | undefined {
  if (definitions.length === 0 && synonyms.length === 0 && antonyms.length === 0) return undefined;
  const synonymGroups = rankedGroups(synonyms, "Synonyms");
  const antonymGroups = rankedGroups(antonyms, "Antonyms");
  const partOfSpeech = pos ? POS_NAMES[pos] : undefined;

  return {
    id: `${query}:${pos ?? "word"}`,
    word: query,
    partOfSpeech,
    definitions,
    synonyms: synonymGroups.flatMap((group) => group.words),
    antonyms: antonymGroups.flatMap((group) => group.words),
    synonymGroups,
    antonymGroups,
  };
}

function rankedGroups(words: DatamuseWord[], label: string): RelevanceGroup[] {
  if (words.length === 0) return [];
  const top = words[0].score ?? 0;
  const close: string[] = [];
  const rest: string[] = [];
  for (const word of words) {
    const score = word.score ?? 0;
    if (top > 0 && score >= top * 0.7) close.push(word.word ?? "");
    else rest.push(word.word ?? "");
  }

  const groups: RelevanceGroup[] = [];
  if (close.length > 0) groups.push({ label, words: uniqueWords(close) });
  if (rest.length > 0) groups.push({ label: groups.length === 0 ? label : "", words: uniqueWords(rest) });
  return groups;
}

function definitionsByPos(head: DatamuseWord | undefined): Map<string, string[]> {
  const definitions = new Map<string, string[]>();
  for (const definition of head?.defs ?? []) {
    const split = definition.indexOf("\t");
    if (split <= 0) continue;
    const pos = definition.slice(0, split);
    const text = cleanDefinition(definition.slice(split + 1));
    if (!POS_NAMES[pos] || !text) continue;
    const list = definitions.get(pos) ?? [];
    if (list.length >= DEFINITION_LIMIT || list.includes(text)) continue;
    list.push(text);
    definitions.set(pos, list);
  }
  return definitions;
}

function rankedWords(words: DatamuseWord[], query: string): DatamuseWord[] {
  const seen = new Set<string>();
  return words
    .filter((word) => {
      const text = word.word?.trim();
      if (!text || sameTerm(text, query)) return false;
      const key = text.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      word.word = text;
      return true;
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function primaryPos(tags: string[] | undefined): string | undefined {
  return tags?.find((tag) => POS_NAMES[tag]);
}

function uniqueWords(words: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const word of words) {
    const text = word.trim();
    const key = text.toLocaleLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    unique.push(text);
  }
  return unique;
}

function cleanDefinition(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function sameTerm(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

async function datamuseWords(params: Record<string, string>, path = "/words"): Promise<DatamuseWord[]> {
  const url = new URL(path, DATAMUSE);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(response.status === 429 ? "Datamuse is rate limiting searches." : "Datamuse could not be reached.");
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("Datamuse returned an unreadable response.");
  return payload.filter((item): item is DatamuseWord => typeof item === "object" && item !== null);
}
