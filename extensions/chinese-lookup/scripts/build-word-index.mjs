// Builds assets/data/word-index.json, the word list used to compose pinyin input into
// words and phrases.
//
// Usage:
//   pip install wordfreq
//   python -c 'import json, wordfreq; json.dump(wordfreq.get_frequency_dict("zh", wordlist="large"), open("wordfreq-zh.json", "w"), ensure_ascii=False)'
//   curl -LO https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.zip
//   unzip cedict_1_0_ts_utf-8_mdbg.zip
//   node scripts/build-word-index.mjs wordfreq-zh.json cedict_ts.u8
//
// Words, readings, definitions and traditional forms come from CC-CEDICT (CC BY-SA 4.0).
// Word frequencies come from wordfreq (CC BY-SA 4.0), which blends subtitles, Wikipedia,
// news and social media, so everyday words like 你好 rank properly. A word is kept when its
// frequency is at least MIN_FREQUENCY per billion words. Output is { total, chars, words }:
// - total: the frequency scale (occurrences per billion words)
// - chars: frequency of each single character used as a word
// - charDefinitions: CC-CEDICT definition of each common character per reading, keyed
//   "char|numbered pinyin" ("行|xing2", "行|hang2"), for glossing phrases built from parts
// - words: [simplified, numbered pinyin, frequency, definition, traditional (empty when
//   the same as simplified)], sorted most frequent first

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [wordfreqFile, cedictFile] = process.argv.slice(2);
if (!wordfreqFile || !cedictFile) {
  console.error("Usage: node scripts/build-word-index.mjs <wordfreq-zh.json> <cedict_ts.u8>");
  process.exit(1);
}

const outFile = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "data", "word-index.json");
const MAX_DEFINITION_LENGTH = 50;
const MIN_FREQUENCY = 30;
const MAX_WORD_LENGTH = 8;
const HAN = /^\p{Script=Han}+$/u;

const total = 1e9;
const frequencies = new Map();
const chars = {};
for (const [word, share] of Object.entries(JSON.parse(readFileSync(wordfreqFile, "utf8")))) {
  const frequency = Math.round(share * total);
  frequencies.set(word, frequency);
  if ([...word].length === 1 && HAN.test(word)) chars[word] = frequency;
}

// Drops parenthetical asides, nested ones included, from a sense unless that would leave
// nothing: "(since the early 20th century) he; him" -> "he; him", "(completed action marker)" stays.
const withoutAsides = (sense) => {
  let text = sense;
  for (let previous = ""; text !== previous; ) {
    previous = text;
    text = text.replace(/\s*\([^()]*\)\s*/g, " ");
  }
  return text.trim() || sense;
};

// Archaic senses ("(archaic) agate" for 码) and pronunciation notes ("Taiwan pr. [xx]") say
// little about a character today; they are dropped when it has other senses.
const isMarginalSense = (sense) => /^\((archaic|obsolete)\)|^(Taiwan |also |old )?pr\. /i.test(sense);

const cleanDefinition = (raw, { dropAsides = false } = {}) => {
  const senses = raw.split("/").filter((part) => part && !part.startsWith("CL:"));
  const everyday = senses.filter((sense) => !isMarginalSense(sense));
  const parts = (dropAsides && everyday.length > 0 ? everyday : senses)
    .map((part) =>
      part
        .replace(/\S+\|(\S+?)(?=\[|\s|$)/g, "$1") // 時間|时间 -> 时间
        .replace(/\[[A-Za-z0-9:, ]+\]/g, "") // drop [shi2 jian1] references
        .trim(),
    )
    .map((part) => (dropAsides ? withoutAsides(part) : part))
    .filter((part, index, all) => all.indexOf(part) === index); // "difficult (to...)/difficult"
  let text = "";
  for (const part of parts) {
    const next = text ? `${text}; ${part}` : part;
    if (text && next.length > MAX_DEFINITION_LENGTH) break;
    text = next;
  }
  return text.length > MAX_DEFINITION_LENGTH ? `${text.slice(0, MAX_DEFINITION_LENGTH - 1)}…` : text;
};

const isVariantNote = (definition) => /^(old |archaic |)variant of /.test(definition);
// Character entries that only point elsewhere ("variant of 吃", "used in 道行") say nothing
// about meaning; Unihan's definition is used for those instead.
const isReferenceOnly = (definition) => /variant of |^used in \p{Script=Han}/u.test(definition);

const charDefinitions = {};

const words = new Map(); // "simplified|pinyin" -> entry
const entryPattern = /^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/;
for (const line of readFileSync(cedictFile, "utf8").split("\n")) {
  const match = entryPattern.exec(line.trim());
  if (!match) continue;
  const [, traditional, simplified, rawPinyin, rawDefinition] = match;
  const length = [...simplified].length;
  if (length === 1) {
    // Capitalized pinyin marks proper nouns (王 [Wang2] "surname Wang").
    if (!HAN.test(simplified) || /^[A-Z]/.test(rawPinyin) || (chars[simplified] ?? 0) < MIN_FREQUENCY) continue;
    const syllable = rawPinyin.replace(/u:/g, "v");
    // Character senses often open with a long aside that would crowd out the meaning.
    const definition = cleanDefinition(rawDefinition, { dropAsides: true });
    const key = `${simplified}|${syllable}`;
    const isReference = isReferenceOnly(cleanDefinition(rawDefinition));
    if (/^[a-z]+[1-5]$/.test(syllable) && !isReference && !(key in charDefinitions)) {
      charDefinitions[key] = definition;
    }
    continue;
  }
  if (length < 2 || length > MAX_WORD_LENGTH || !HAN.test(simplified)) continue;

  const frequency = frequencies.get(simplified) ?? 0;
  if (frequency < MIN_FREQUENCY) continue;

  const syllables = rawPinyin.toLowerCase().replace(/u:/g, "v").split(" ");
  if (syllables.length !== length || !syllables.every((s) => /^[a-z]+[1-5]$/.test(s))) continue;
  const pinyin = syllables.join(" ");

  const definition = cleanDefinition(rawDefinition);
  const key = `${simplified}|${pinyin}`;
  const existing = words.get(key);
  if (existing && !isVariantNote(existing[3])) continue;
  if (existing && isVariantNote(definition)) continue;
  words.set(key, [simplified, pinyin, frequency, definition, traditional === simplified ? "" : traditional]);
}

const sorted = [...words.values()].sort((a, b) => b[2] - a[2]);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ total, chars, charDefinitions, words: sorted }));
console.log(
  `Wrote ${sorted.length} words and ${Object.keys(charDefinitions).length} character definitions to ${outFile}`,
);
