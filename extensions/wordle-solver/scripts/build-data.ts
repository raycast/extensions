import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const SRC_DIR = join(ROOT, "data-src");
const OUT_FILE = join(ROOT, "src", "data", "wordlists.ts");

const FIVE_LETTER = /^[a-z]{5}$/;

function readWords(filename: string): string[] {
  const path = join(SRC_DIR, filename);
  if (!existsSync(path)) {
    console.error(`✗ Missing required file: data-src/${filename}`);
    process.exit(1);
  }
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const w = raw.trim().toLowerCase();
    if (!FIVE_LETTER.test(w)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

const answersRaw = readWords("answers.txt");
const guessesRaw = readWords("guesses.txt");
const frequencyRaw = readWords("frequency.txt");

const guessSet = new Set(guessesRaw);
const missingFromGuesses = answersRaw.filter((a) => !guessSet.has(a));
if (missingFromGuesses.length > 0) {
  console.warn(
    `⚠ ${missingFromGuesses.length} answers are not in guesses.txt; auto-merging into the guess list.`,
  );
  for (const w of missingFromGuesses) guessSet.add(w);
}

const guessesSorted = Array.from(guessSet).sort();
const answersSorted = [...answersRaw].sort();

const freqRank = new Map<string, number>();
frequencyRaw.forEach((w, i) => {
  if (!freqRank.has(w)) freqRank.set(w, i);
});

const wordsWithRank = guessesSorted.filter((w) => freqRank.has(w));
const coverage = ((wordsWithRank.length / guessesSorted.length) * 100).toFixed(1);

const header = `// AUTO-GENERATED — do not edit. Regenerate via \`npm run build:data\`.\n`;
const rankEntries = guessesSorted
  .filter((w) => freqRank.has(w))
  .map((w) => `  ["${w}", ${freqRank.get(w)}]`)
  .join(",\n");

const body =
  `${header}\n` +
  `export const ANSWERS: readonly string[] = ${stringifyWords(answersSorted)};\n\n` +
  `export const GUESSES: readonly string[] = ${stringifyWords(guessesSorted)};\n\n` +
  `export const GUESS_SET: ReadonlySet<string> = new Set(GUESSES);\n\n` +
  `export const FREQ_RANK: ReadonlyMap<string, number> = new Map([\n${rankEntries}\n]);\n`;

writeFileSync(OUT_FILE, body, "utf8");

console.log(`✓ Wrote ${OUT_FILE}`);
console.log(`  ANSWERS:  ${answersSorted.length}`);
console.log(`  GUESSES:  ${guessesSorted.length}`);
console.log(`  FREQ_RANK coverage: ${coverage}% (${wordsWithRank.length}/${guessesSorted.length})`);

function stringifyWords(words: readonly string[]): string {
  const lines: string[] = ["["];
  const PER_LINE = 10;
  for (let i = 0; i < words.length; i += PER_LINE) {
    const chunk = words.slice(i, i + PER_LINE).map((w) => `"${w}"`).join(", ");
    lines.push(`  ${chunk}${i + PER_LINE < words.length ? "," : ""}`);
  }
  lines.push("]");
  return lines.join("\n");
}
