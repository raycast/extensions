// Regenerates src/data/kanji-dictionary.json and src/data/english-index.json
// from a jmdict-simplified "eng-common" release.
//
// Usage:
//   curl -sL -o jmdict.tgz "https://github.com/scriptin/jmdict-simplified/releases/download/<tag>/jmdict-eng-common-<version>.json.tgz"
//   tar xzf jmdict.tgz
//   node scripts/build-kanji-dictionary.mjs jmdict-eng-common-<version>.json
//
// Source data license: CC BY-SA 4.0 (JMdict/EDICT project, Electronic Dictionary
// Research and Development Group) — see README's "Kanji dictionary" section.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as wanakana from "wanakana";

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error("Usage: node scripts/build-kanji-dictionary.mjs <jmdict-eng-common.json>");
  process.exit(1);
}

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = join(projectRoot, "src/data");

const raw = JSON.parse(readFileSync(sourcePath, "utf8"));

const ENGLISH_STOPWORDS = new Set([
  "a", "an", "the", "of", "to", "in", "on", "at", "for", "and", "or", "is",
  "are", "was", "were", "be", "been", "being", "this", "that", "these",
  "those", "it", "its", "as", "by", "with", "from", "one", "some", "also",
  "such", "not", "no", "yes", "you", "your", "his", "her", "their", "our",
  "my", "he", "she", "they", "we", "etc", "into", "used", "usu", "esp",
]);

const MAX_CANDIDATES_PER_TOKEN = 12;
// Two-letter words ("go", "do", "ox") are common enough to be worth indexing;
// the noise ones ("of", "to", "in", ...) are already covered by ENGLISH_STOPWORDS.
const MIN_TOKEN_LENGTH = 2;
// Senses beyond the first still rank below it: scoreGlossTokens() scores by
// phrase position, and joining senses keeps later ones later in the string.
const MAX_SENSES = 3;
const MAX_GLOSSES = 6;

/**
 * Scores each meaningful word in a gloss by how central it is to the meaning,
 * so e.g. searching "bridge" ranks 橋 (gloss: "bridge") above a compound word
 * that only mentions "bridge" in a parenthetical aside (e.g. "catwalk
 * (... along the side of a bridge, etc.)"). Returns token -> best score (0-3).
 */
function stripParens(text) {
  let previous;
  do {
    previous = text;
    text = text.replace(/\([^()]*\)/g, " ");
  } while (text !== previous);
  return text;
}

function scoreGlossTokens(senseGlosses) {
  const scores = new Map();
  // Scored per sense, not over the joined string: a token from a *later* sense
  // (猫 = "shamisen") is a different meaning entirely and must never outrank a
  // token from the primary sense, otherwise adding later senses pushes good
  // primary-sense matches out of the per-token top-N (e.g. 茶碗 losing "cup").
  senseGlosses.forEach((senseGloss, senseIndex) =>
  senseGloss.split(";").forEach((phrase, phraseIndex) => {
    const parens = [...phrase.matchAll(/\(([^()]*)\)/g)].map((m) => m[1]);
    const main = stripParens(phrase).trim().toLowerCase();
    const mainTokens = main
      .split(/[^a-z']+/)
      .filter((t) => t.length >= MIN_TOKEN_LENGTH && !ENGLISH_STOPWORDS.has(t));
    const isExactPrimaryPhrase = phraseIndex === 0 && main === mainTokens[0];

    for (const token of mainTokens) {
      const score =
        senseIndex > 0 ? 0 : isExactPrimaryPhrase ? 3 : phraseIndex === 0 ? 2 : 1;
      if ((scores.get(token) ?? -1) < score) scores.set(token, score);
    }
    for (const paren of parens) {
      for (const token of paren
        .toLowerCase()
        .split(/[^a-z']+/)
        .filter((t) => t.length >= MIN_TOKEN_LENGTH && !ENGLISH_STOPWORDS.has(t))) {
        if (!scores.has(token)) scores.set(token, 0);
      }
    }
  }),
  );
  return scores;
}

// JMdict carries no JLPT levels — that would need a separately-licensed word
// list — but every sense does carry `partOfSpeech` codes, which are what the UI
// shows as a tag. Only the codes actually used are emitted, with the label
// shortened to its leading phrase ("noun (common) (futsuumeishi)" -> "noun").
const posLabels = new Map();
function posOf(sense) {
  const code = sense.partOfSpeech[0];
  if (!code) return undefined;
  if (!posLabels.has(code)) {
    const raw_label = raw.tags[code] ?? code;
    posLabels.set(code, stripParens(raw_label).replace(/\s+/g, " ").trim());
  }
  return code;
}

/** hiragana reading -> Map<kanjiText, { kanji, gloss, common }> (for Kanji suggestions + reverse Kanji lookup) */
const kanjiMap = new Map();

/** english token -> [{ entry: { reading, kanji?, gloss }, common }] (for English -> Japanese search) */
const englishMap = new Map();

for (const word of raw.words) {
  const englishSenses = word.sense.filter((s) =>
    s.gloss.some((g) => g.lang === "eng"),
  );
  const firstSense = englishSenses[0];
  if (!firstSense) continue;

  // Glosses are collected across senses, not just the first: a third of JMdict's
  // common words carry more than one sense (猫 has six), and indexing only the
  // first made every later meaning unfindable by English search and invisible in
  // the detail pane. Capped so a many-sense word doesn't dominate the file.
  const senseGlosses = englishSenses
    .slice(0, MAX_SENSES)
    .map((s) =>
      s.gloss
        .filter((g) => g.lang === "eng")
        .slice(0, 3)
        .map((g) => g.text)
        .join("; "),
    )
    .filter(Boolean);
  const gloss = senseGlosses.join("; ").split("; ").slice(0, MAX_GLOSSES).join("; ");
  if (!gloss) continue;

  const pos = posOf(firstSense);

  // --- Kanji suggestions / reverse Kanji lookup (only words that have a Kanji spelling) ---
  if (word.kanji.length) {
    for (const kana of word.kana) {
      const reading = wanakana.toHiragana(kana.text);
      const appliesToAll =
        kana.appliesToKanji.length === 0 || kana.appliesToKanji.includes("*");
      const applicableKanji = appliesToAll
        ? word.kanji
        : word.kanji.filter((k) => kana.appliesToKanji.includes(k.text));

      for (const kanji of applicableKanji) {
        if (!kanjiMap.has(reading)) kanjiMap.set(reading, new Map());
        const candidates = kanjiMap.get(reading);
        if (!candidates.has(kanji.text)) {
          candidates.set(kanji.text, {
            kanji: kanji.text,
            gloss,
            pos,
            common: Boolean(kanji.common && kana.common),
          });
        }
      }
    }
  }

  // --- English -> Japanese search index (every word with a reading, Kanji or not) ---
  const primaryKana = word.kana.find((k) => k.common) ?? word.kana[0];
  if (!primaryKana) continue;
  // Unlike the kanji dictionary (whose keys must be hiragana to match converted
  // Romaji input), the English index only ever displays its reading, so it keeps
  // JMdict's own script — loanwords stay Katakana (コーヒー, not こうひい).
  const reading = primaryKana.text;

  let kanjiSpelling;
  if (word.kanji.length) {
    const appliesToAll =
      primaryKana.appliesToKanji.length === 0 || primaryKana.appliesToKanji.includes("*");
    const applicable = appliesToAll
      ? word.kanji
      : word.kanji.filter((k) => primaryKana.appliesToKanji.includes(k.text));
    const pick = applicable.find((k) => k.common) ?? applicable[0] ?? word.kanji[0];
    kanjiSpelling = pick?.text;
  }

  const entry = kanjiSpelling
    ? { reading, kanji: kanjiSpelling, gloss, pos }
    : { reading, gloss, pos };
  const common = Boolean(primaryKana.common);

  for (const [token, score] of scoreGlossTokens(senseGlosses)) {
    if (!englishMap.has(token)) englishMap.set(token, []);
    englishMap.get(token).push({ entry, common, score });
  }
}

// Array of [reading, candidates] tuples rather than a { [reading]: ... } object —
// a plain object with 17k+ literal keys makes TypeScript's JSON-module type
// inference (and `tsc`'s checking of it) balloon; an array has one uniform
// element type instead. Turned into a Map at runtime (see convert.tsx). The
// `common` flag sorts the candidates here and is also kept on common entries,
// which the reverse (Kanji -> reading) direction uses to disambiguate.
const kanjiEntries = [...kanjiMap].map(([reading, candidates]) => [
  reading,
  [...candidates.values()]
    .sort((a, b) => Number(b.common) - Number(a.common))
    // `common` is emitted only when true (keeping the file small) because the
    // reverse direction needs it: a Kanji spelling with several readings (案 =
    // あん / つくえ) must be able to pick the likely one instead of whichever
    // reading happened to be inserted first.
    .map(({ kanji, gloss, pos, common }) =>
      common ? { kanji, gloss, pos, common } : { kanji, gloss, pos },
    ),
]);

// Word entries are heavily shared across tokens (a single gloss like "matcha;
// powdered green tea" gets indexed under "matcha", "powdered", "green", and
// "tea"), so they're deduped into one array and referenced by index rather
// than repeating the { reading, kanji, gloss } object under every token.
const wordList = [];
const wordIndexByKey = new Map();
function internWord(entry) {
  const key = `${entry.reading}|${entry.kanji ?? ""}|${entry.gloss}`;
  let index = wordIndexByKey.get(key);
  if (index === undefined) {
    index = wordList.length;
    wordList.push(entry);
    wordIndexByKey.set(key, index);
  }
  return index;
}

const englishEntries = [...englishMap].map(([token, results]) => [
  token,
  results
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.common) - Number(a.common) ||
        // Tie-break toward shorter readings: among equally-scored, equally-common
        // matches this tends to favor basic native vocabulary (はし) over more
        // specialized loanwords/compounds (ぶりっじ) sharing the same short gloss.
        a.entry.reading.length - b.entry.reading.length,
    )
    .slice(0, MAX_CANDIDATES_PER_TOKEN)
    .map((r) => internWord(r.entry)),
]);

mkdirSync(dataDir, { recursive: true });

writeFileSync(
  join(dataDir, "kanji-dictionary.json"),
  JSON.stringify({
    source: "jmdict-simplified (jmdict-eng-common build)",
    version: raw.version,
    license:
      "CC BY-SA 4.0 — JMdict/EDICT project, Electronic Dictionary Research and Development Group",
    posLabels: [...posLabels],
    entries: kanjiEntries,
  }),
);

writeFileSync(
  join(dataDir, "english-index.json"),
  JSON.stringify({
    source: "jmdict-simplified (jmdict-eng-common build)",
    version: raw.version,
    license:
      "CC BY-SA 4.0 — JMdict/EDICT project, Electronic Dictionary Research and Development Group",
    // Shipped so convert.tsx can drop the same stopwords from a query that were
    // dropped when indexing; keeping a second hand-written copy in the extension
    // would silently drift from this one.
    stopwords: [...ENGLISH_STOPWORDS],
    posLabels: [...posLabels],
    words: wordList,
    entries: englishEntries,
  }),
);

console.log(`kanji-dictionary.json: ${kanjiEntries.length} readings`);
console.log(`english-index.json: ${englishEntries.length} tokens, ${wordList.length} words`);
