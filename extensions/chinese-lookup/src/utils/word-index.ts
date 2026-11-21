import { cn2tw, tw2cn } from "cjk-conv";
import { pinyin as contextPinyin } from "pinyin-pro";
import { readDataFile } from "./data-file";
import {
  CharacterEntry,
  characterEntry,
  CharacterMatch,
  charactersForSyllable,
  formatSyllable,
  NEUTRAL_TONE,
  QueryToken,
  Reading,
  syllablesStartingWith,
  TOTAL_READING_COUNT,
} from "./pinyin-index";

// [simplified, numbered pinyin ("ni3 hao3"), frequency, definition, traditional or ""]
type RawWord = [string, string, number, string, string];

interface WordData {
  total: number;
  chars: Record<string, number>;
  // CC-CEDICT definitions of common characters per reading, keyed "char|numbered pinyin" ("行|xing2").
  charDefinitions: Record<string, string>;
  words: RawWord[];
}

interface WordEntry {
  word: string;
  syllables: string[];
  tones: number[];
  frequency: number;
  definition: string;
  traditional: string;
}

export interface Segment {
  text: string;
  pinyin: string;
  definition: string;
  traditional: string;
}

export interface Suggestion {
  text: string;
  pinyin: string;
  definition: string;
  traditional: string;
  segments: Segment[];
}

interface Candidate {
  score: number;
  segment: Segment;
}

interface Path {
  score: number;
  segments: Segment[];
}

// Where the last syllable may still be incomplete ("shij" -> shi + jian/jia/...), completed
// syllables are allowed but count for less than ones the user typed in full.
interface SyllableOption {
  syllable: string;
  exact: boolean;
}

const COMPLETION_PENALTY = Math.log(0.1);
const SEGMENT_PENALTY = Math.log(0.3);
const WORDFREQ_WEIGHT = 0.3;
// Sentence-final particles are far more likely as the last character of the input than
// their homophones (你好吗 over 你号码, 走吧 over 走把).
const FINAL_PARTICLES = new Set([..."吗吧呢啊呀嘛啦哦哈"]);
const FINAL_PARTICLE_BONUS = Math.log(4);
const CANDIDATES_PER_SPAN = 5;
const PATHS_PER_POSITION = 5;
const MAX_SUGGESTIONS = 15;
const MAX_SYLLABLE_COMBINATIONS = 200;

let words:
  | {
      total: number;
      chars: Record<string, number>;
      charDefinitions: Record<string, string>;
      byKey: Map<string, WordEntry[]>;
      // The most frequent reading of each word, for looking up written text.
      byText: Map<string, WordEntry>;
      maxLength: number;
    }
  | undefined;

const loadWords = () => {
  if (words) return words;
  const data = readDataFile<WordData>("word-index.json");
  const byKey = new Map<string, WordEntry[]>();
  const byText = new Map<string, WordEntry>();
  let maxLength = 1;
  for (const [word, pinyin, frequency, definition, traditional] of data.words) {
    const parts = pinyin.split(" ");
    const entry: WordEntry = {
      word,
      syllables: parts.map((part) => part.slice(0, -1)),
      tones: parts.map((part) => Number(part.slice(-1))),
      frequency,
      definition,
      traditional: traditional || word,
    };
    const key = entry.syllables.join(" ");
    const list = byKey.get(key) ?? [];
    list.push(entry);
    byKey.set(key, list);
    // Words are stored most frequent first.
    if (!byText.has(word)) byText.set(word, entry);
    maxLength = Math.max(maxLength, parts.length);
  }
  words = { total: data.total, chars: data.chars, charDefinitions: data.charDefinitions, byKey, byText, maxLength };
  return words;
};

const syllableOptions = (token: QueryToken, isLast: boolean): SyllableOption[] => {
  if (!token.isPrefix && (!isLast || token.tone !== undefined)) return [{ syllable: token.syllable, exact: true }];
  return syllablesStartingWith(token.syllable).map((syllable) => ({
    syllable,
    exact: !token.isPrefix && syllable === token.syllable,
  }));
};

const wordSegment = (entry: WordEntry): Segment => ({
  text: entry.word,
  pinyin: entry.syllables.map((syllable, i) => formatSyllable(syllable, entry.tones[i])).join(" "),
  definition: entry.definition,
  traditional: entry.traditional,
});

// Prefers CC-CEDICT's definition for this reading (行 xíng "to walk" vs háng "row") over
// Unihan's, which covers every reading at once.
const characterSegment = (entry: CharacterEntry, reading: Reading): Segment => ({
  text: entry.char,
  pinyin: reading.pinyin,
  definition: loadWords().charDefinitions[`${entry.char}|${reading.syllable}${reading.tone}`] ?? entry.definition,
  traditional: entry.traditional[0] ?? entry.char,
});

// Scores a single character by blending two estimates: its frequency as a standalone word
// (wordfreq) x the share of its usage that has this reading, and the frequency of this
// reading in Hanyu Pinlu. wordfreq alone overrates characters common in formal web text
// (较 over 叫, 及 over 几); Hanyu Pinlu comes from a balanced corpus. Counts are smoothed
// so readings without data are unlikely rather than impossible.
const characterCandidates = (token: QueryToken, options: SyllableOption[]): Candidate[] => {
  const { total, chars } = loadWords();
  const candidates: Candidate[] = [];
  for (const { syllable, exact } of options) {
    for (const entry of charactersForSyllable(syllable)) {
      const readings = entry.readings
        .filter((reading) => reading.syllable === syllable && (token.tone === undefined || reading.tone === token.tone))
        .sort((a, b) => b.count - a.count);
      if (readings.length === 0) continue;
      const matching = readings.reduce((sum, reading) => sum + reading.count + 0.5, 0);
      const all = entry.readings.reduce((sum, reading) => sum + reading.count + 0.5, 0);
      const frequency = Math.max(chars[entry.char] ?? 0, 1);
      const wordfreqScore = Math.log((frequency * matching) / all / total);
      const pinluScore = Math.log(matching / TOTAL_READING_COUNT);
      candidates.push({
        score: WORDFREQ_WEIGHT * wordfreqScore + (1 - WORDFREQ_WEIGHT) * pinluScore + (exact ? 0 : COMPLETION_PENALTY),
        segment: characterSegment(entry, readings[0]),
      });
    }
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, CANDIDATES_PER_SPAN);
};

const matchingWords = (tokens: QueryToken[], options: SyllableOption[][]): Candidate[] => {
  const { total, byKey } = loadWords();
  let combinations = [{ syllables: [] as string[], exact: true }];
  for (const tokenOptions of options) {
    combinations = combinations.flatMap((combination) =>
      tokenOptions.map((option) => ({
        syllables: [...combination.syllables, option.syllable],
        exact: combination.exact && option.exact,
      })),
    );
    if (combinations.length > MAX_SYLLABLE_COMBINATIONS) return [];
  }

  const candidates: Candidate[] = [];
  for (const { syllables, exact } of combinations) {
    for (const entry of byKey.get(syllables.join(" ")) ?? []) {
      if (tokens.some((token, i) => token.tone !== undefined && entry.tones[i] !== token.tone)) continue;
      candidates.push({
        score: Math.log(entry.frequency / total) + (exact ? 0 : COMPLETION_PENALTY),
        segment: wordSegment(entry),
      });
    }
  }
  return candidates.sort((a, b) => b.score - a.score);
};

// The first sense of a definition without asides: "man, male adult, husband; those" -> "man",
// "(bound form) to walk; to go" -> "to walk". Senses that are entirely an aside, such as
// "(completed action marker)", are kept as they are.
const gloss = (definition: string) => {
  const sense = definition.split(";")[0].trim();
  const withoutAsides = sense.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  return withoutAsides ? withoutAsides.split(",")[0].trim() : sense;
};

// Phrases that aren't dictionary words get a literal meaning built from their parts,
// e.g. 吃服 -> "eat · clothes".
const toSuggestion = (segments: Segment[]): Suggestion => ({
  text: segments.map((segment) => segment.text).join(""),
  pinyin: segments.map((segment) => segment.pinyin).join(" "),
  definition:
    segments.length === 1
      ? segments[0].definition
      : segments.map((segment) => gloss(segment.definition) || segment.text).join(" · "),
  traditional: segments.map((segment) => segment.traditional).join(""),
  segments,
});

const bestPaths = (paths: Path[], limit: number): Path[] => {
  const seen = new Set<string>();
  return paths
    .sort((a, b) => b.score - a.score)
    .filter((path) => {
      const text = path.segments.map((segment) => segment.text).join("");
      return !seen.has(text) && seen.add(text);
    })
    .slice(0, limit);
};

// Turns two or more syllables into likely words and phrases. Each way of writing the input
// as a sequence of dictionary words and single characters is scored with a unigram model
// (product of word frequencies, with a penalty per segment so whole words beat strings of
// single characters); the best few are kept, alongside every word that spans the whole input.
export const composeSuggestions = (tokens: QueryToken[]): Suggestion[] => {
  if (tokens.length < 2) return [];
  const { maxLength } = loadWords();
  const options = tokens.map((token, i) => syllableOptions(token, i === tokens.length - 1));

  const paths: Path[][] = [[{ score: 0, segments: [] }]];
  let wholeInputWords: Candidate[] = [];

  for (let end = 1; end <= tokens.length; end++) {
    const extended: Path[] = [];
    for (let start = Math.max(0, end - maxLength); start < end; start++) {
      const previousPaths = paths[start] ?? [];
      if (previousPaths.length === 0) continue;
      const candidates =
        end - start === 1
          ? characterCandidates(tokens[start], options[start])
          : matchingWords(tokens.slice(start, end), options.slice(start, end));
      if (start === 0 && end === tokens.length) wholeInputWords = candidates;
      for (const previous of previousPaths) {
        for (const candidate of candidates.slice(0, CANDIDATES_PER_SPAN)) {
          const isFinalParticle = end === tokens.length && FINAL_PARTICLES.has(candidate.segment.text);
          extended.push({
            score: previous.score + candidate.score + SEGMENT_PENALTY + (isFinalParticle ? FINAL_PARTICLE_BONUS : 0),
            segments: [...previous.segments, candidate.segment],
          });
        }
      }
    }
    paths[end] = bestPaths(extended, PATHS_PER_POSITION);
  }

  const wholeWordPaths = wholeInputWords.map((candidate) => ({
    score: candidate.score + SEGMENT_PENALTY,
    segments: [candidate.segment],
  }));
  return bestPaths([...(paths[tokens.length] ?? []), ...wholeWordPaths], MAX_SUGGESTIONS).map((path) =>
    toSuggestion(path.segments),
  );
};

const HAN = /\p{Script=Han}/u;
export const containsHan = (text: string) => HAN.test(text);

const charDefinition = (char: string, syllable: string, tone: number) =>
  loadWords().charDefinitions[`${char}|${syllable}${tone}`];

// Every reading of a single character with its meaning, most common reading first. Readings
// CC-CEDICT has no meaning for are left out unless none has one, when Unihan's covers them all.
export const characterReadings = (char: string): Segment[] => {
  const entry = characterEntry(tw2cn(char, { safe: false })) ?? characterEntry(char);
  if (!entry) return [];
  const traditional = entry.traditional.join(" / ") || entry.char;
  const readings = [...entry.readings].sort((a, b) => b.count - a.count);
  const defined = readings.flatMap((reading) => {
    const definition = charDefinition(entry.char, reading.syllable, reading.tone);
    return definition ? [{ text: entry.char, pinyin: reading.pinyin, definition, traditional }] : [];
  });
  if (defined.length > 0) return defined;
  const pinyin = readings.map((reading) => reading.pinyin).join(", ");
  return [{ text: entry.char, pinyin, definition: entry.definition, traditional }];
};

// The meanings of a matched character for the readings the user typed, most common first, so
// 行 under "hang" means "row" rather than "to walk". Falls back to Unihan's definition, which
// covers every reading at once, when CC-CEDICT has none for them.
export const matchMeanings = ({ entry, readings }: CharacterMatch): { pinyin: string; definition: string }[] => {
  const meanings = readings.flatMap((reading) => {
    const definition = charDefinition(entry.char, reading.syllable, reading.tone);
    return definition ? [{ pinyin: reading.pinyin, definition }] : [];
  });
  if (meanings.length > 0) return meanings;
  return [{ pinyin: readings.map((reading) => reading.pinyin).join(", "), definition: entry.definition }];
};

// A character read the way pinyin-pro reads it in context ("le0"), falling back to its most
// common reading.
const characterInContext = (char: string, numbered?: string): Segment => {
  const entry = characterEntry(char);
  const match = numbered ? /^([a-z]+)([0-5])$/.exec(numbered) : null;
  const reading = match
    ? { syllable: match[1], tone: Number(match[2]) || NEUTRAL_TONE }
    : entry?.readings.reduce<Reading | undefined>((best, r) => (best && best.count >= r.count ? best : r), undefined);
  return {
    text: char,
    pinyin: reading ? formatSyllable(reading.syllable, reading.tone) : "",
    definition: (reading && charDefinition(char, reading.syllable, reading.tone)) || entry?.definition || "",
    // Unihan lists every traditional form a character merged (了 <- 瞭), so pick the usual one.
    traditional: cn2tw(char, { safe: false }),
  };
};

interface TextPart {
  text: string;
  segment?: Segment;
}

// Splits written Chinese into dictionary words, choosing the split with the most likely words
// (the same unigram model as composeSuggestions). Traditional input is looked up through its
// simplified form; anything that isn't a Han character passes through untouched.
const segmentText = (text: string): TextPart[] => {
  const { total, chars, byText, maxLength } = loadWords();
  const original = [...text];
  const converted = [...tw2cn(text, { safe: false })];
  const simplified = converted.length === original.length ? converted : original;
  const readings = contextPinyin(simplified.join(""), { type: "array", toneType: "num", v: true });
  const readingAt = (i: number) => (readings.length === simplified.length ? readings[i] : undefined);

  const best: { score: number; start: number }[] = [{ score: 0, start: 0 }];
  for (let end = 1; end <= simplified.length; end++) {
    let choice = { score: -Infinity, start: end - 1 };
    if (!HAN.test(simplified[end - 1])) choice = { score: best[end - 1].score, start: end - 1 };
    for (let start = end - 1; start >= Math.max(0, end - maxLength) && HAN.test(simplified[start]); start--) {
      const word = simplified.slice(start, end).join("");
      const frequency = end - start === 1 ? Math.max(chars[word] ?? 0, 1) : byText.get(word)?.frequency;
      if (frequency === undefined) continue;
      const score = best[start].score + Math.log(frequency / total) + SEGMENT_PENALTY;
      if (score > choice.score) choice = { score, start };
    }
    best[end] = choice;
  }

  const parts: TextPart[] = [];
  for (let end = simplified.length; end > 0; end = best[end].start) {
    const start = best[end].start;
    const word = simplified.slice(start, end).join("");
    const written = original.slice(start, end).join("");
    const entry = byText.get(word);
    const segment = !HAN.test(word)
      ? undefined
      : end - start === 1
        ? characterInContext(word, readingAt(start))
        : entry && wordSegment(entry);
    const previous = parts[0];
    if (!segment && previous && !previous.segment) previous.text = written + previous.text;
    else parts.unshift({ text: written, segment });
  }
  return parts;
};

export interface ChineseText {
  text: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  // Each distinct word in the text, in order of first appearance.
  words: Segment[];
}

const PINYIN_PUNCTUATION: Record<string, string> = {
  "，": ",",
  "。": ".",
  "！": "!",
  "？": "?",
  "；": ";",
  "：": ":",
  "、": ",",
  "（": "(",
  "）": ")",
};

export const describeChinese = (text: string): ChineseText => {
  const parts = segmentText(text);
  const pinyin = parts
    .map(({ text, segment }) =>
      segment
        ? segment.pinyin
        : [...text]
            .map((c) => PINYIN_PUNCTUATION[c] ?? c)
            .join("")
            .trim(),
    )
    .filter(Boolean)
    .join(" ")
    .replace(/ ([,.!?;:)])/g, "$1");
  const seen = new Set<string>();
  return {
    text,
    simplified: parts.map(({ text, segment }) => segment?.text ?? text).join(""),
    // Characters typed in traditional form stay as typed; one simplified character can stand
    // for several traditional ones (发 -> 發 or 髮).
    traditional: parts
      .map(({ text, segment }) => (segment && text === segment.text ? segment.traditional : text))
      .join(""),
    pinyin,
    words: parts.flatMap(({ segment }) => {
      const key = segment && `${segment.text}|${segment.pinyin}`;
      if (!segment || !key || seen.has(key)) return [];
      seen.add(key);
      return [segment];
    }),
  };
};

// English words that are also pinyin syllables. Other syllables in definitions are romanizations
// ("kung fu", "tai chi") and don't make a query look like English.
const ENGLISH_SYLLABLES = new Set(
  "a an ban bang bin can den die ding dong fan gang gong gun ha hang he hen lie long ma man me men pa pan pen pie pin ping ran rang run sang she shun song sun tan tie wan yo you".split(
    " ",
  ),
);
const BASIC_ENGLISH = new Set(["i", "a", "an", "the", "to", "is", "are", "am"]);

let syllableSet: Set<string> | undefined;
const englishWordCache = new Map<string, boolean>();

const englishWords = (text: string) => text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];

// Calls visit with every English definition in the dictionary: each word, and each reading of
// each common character. Segments are only built for the entries visit accepts, since the
// dictionary is scanned on every query rather than indexed (an index costs too much memory).
const scanDefinitions = (visit: (definition: string, frequency: number) => ((segment: Segment) => void) | void) => {
  const { byKey, charDefinitions, chars } = loadWords();
  for (const list of byKey.values()) {
    for (const entry of list) visit(entry.definition, entry.frequency)?.(wordSegment(entry));
  }
  for (const key in charDefinitions) {
    const [char, numbered] = key.split("|");
    const accept = visit(charDefinitions[key], Math.max(chars[char] ?? 0, 1));
    accept?.({
      text: char,
      pinyin: formatSyllable(numbered.slice(0, -1), Number(numbered.slice(-1))),
      definition: charDefinitions[key],
      traditional: cn2tw(char, { safe: false }),
    });
  }
};

// Whether a word is used in the dictionary's English. Capitalized uses are mostly names and
// romanizations ("Ma Ying-jeou"), and words cut short by truncation ("wo…") don't count.
const isEnglishWord = (word: string) => {
  if (BASIC_ENGLISH.has(word)) return true;
  syllableSet ??= new Set(syllablesStartingWith(""));
  if (syllableSet.has(word) && !ENGLISH_SYLLABLES.has(word)) return false;
  const cached = englishWordCache.get(word);
  if (cached !== undefined) return cached;
  const pattern = new RegExp(`(?:^|[^A-Za-z'])${word}(?![A-Za-z'…])`);
  let found = false;
  scanDefinitions((definition) => {
    if (!found && definition.includes(word) && pattern.test(definition)) found = true;
  });
  englishWordCache.set(word, found);
  return found;
};

// The share of the query's words that appear in the dictionary's English, which tells English
// ("eat", "i love you") apart from pinyin that hasn't been finished ("shij").
export const englishShare = (query: string) => {
  const words = englishWords(query);
  if (words.length === 0) return 0;
  return words.filter(isEnglishWord).length / words.length;
};

// "to eat (a meal)" -> "eat"; "the King" -> "king".
const normalizeEnglish = (text: string) =>
  text
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(to|a|an|the) (?=\S)/, "");

const LATER_SENSE_PENALTY = 0.7;
const EXTRA_WORD_PENALTY = 0.5;

interface EnglishHit {
  score: number;
  segment: Segment;
}

const rankHits = (hits: EnglishHit[], limit: number): Segment[] => {
  const seen = new Set<string>();
  return hits
    .sort((a, b) => b.score - a.score)
    .map(({ segment }) => segment)
    .filter((segment) => {
      const key = `${segment.text}|${segment.pinyin}`;
      return !seen.has(key) && seen.add(key);
    })
    .slice(0, limit);
};

export interface EnglishMatches {
  // Words with a meaning that is exactly the query ("eat" -> 吃), most common first.
  exact: Segment[];
  // Words with a meaning that contains the query as whole words ("eat" -> 用餐 "to eat a meal").
  related: Segment[];
}

export const lookupEnglish = (query: string, exactLimit: number, relatedLimit: number): EnglishMatches => {
  const normalized = normalizeEnglish(query);
  if (normalized.length < 2) return { exact: [], related: [] };
  const queryWords = normalized.split(" ");
  const longestWord = queryWords.reduce((a, b) => (b.length > a.length ? b : a));
  const filter = new RegExp(longestWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const pattern = new RegExp(`\\b${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  const exact: EnglishHit[] = [];
  const related: EnglishHit[] = [];

  scanDefinitions((definition, frequency) => {
    if (!filter.test(definition)) return;
    let exactScore = -Infinity;
    let relatedScore = -Infinity;
    definition.split(";").forEach((raw, index) => {
      const sense = normalizeEnglish(raw);
      const score = Math.log(frequency) - index * LATER_SENSE_PENALTY;
      if (sense === normalized) exactScore = Math.max(exactScore, score);
      else if (relatedLimit > 0 && pattern.test(sense)) {
        const extraWords = sense.split(" ").length - queryWords.length;
        relatedScore = Math.max(relatedScore, score - extraWords * EXTRA_WORD_PENALTY);
      }
    });
    if (exactScore > -Infinity) return (segment) => exact.push({ score: exactScore, segment });
    if (relatedScore > -Infinity) return (segment) => related.push({ score: relatedScore, segment });
  });

  const exactSegments = rankHits(exact, exactLimit);
  const shown = new Set(exactSegments.map((segment) => segment.text));
  return {
    exact: exactSegments,
    related: rankHits(related, relatedLimit + shown.size)
      .filter((segment) => !shown.has(segment.text))
      .slice(0, relatedLimit),
  };
};
