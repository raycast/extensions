import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ANSWERS } from "../src/data/wordlists";
import { computePatternCode, patternCodeToKey } from "../src/lib/pattern";
import { buildPriors } from "../src/lib/prior";
import { bestGuess } from "../src/lib/solver";
import { STARTER } from "../src/lib/constants";

const OUT = join(__dirname, "..", "src", "data", "turn2-lookup.json");

if (ANSWERS.length === 0) {
  console.error("✗ Wordlists are empty. Run `npm run build:data` first.");
  process.exit(1);
}

const start = Date.now();
const lookup: Record<string, string> = {};

for (let code = 0; code < 243; code++) {
  const filtered: string[] = [];
  for (const answer of ANSWERS) {
    if (computePatternCode(STARTER, answer) === code) filtered.push(answer);
  }
  if (filtered.length === 0) continue;

  let bestWord: string;
  if (filtered.length === 1) {
    bestWord = filtered[0];
  } else {
    const weights = buildPriors(filtered);
    const result = bestGuess(filtered, filtered, weights);
    if (!result) continue;
    bestWord = result.word;
  }

  const key = patternCodeToKey(code);
  lookup[key] = bestWord;
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[${elapsed}s] code=${key}  candidates=${filtered.length.toString().padStart(4)}  → ${bestWord}`,
  );
}

writeFileSync(OUT, JSON.stringify(lookup, null, 2) + "\n", "utf8");
console.log(`\n✓ Wrote ${OUT} with ${Object.keys(lookup).length} entries.`);
console.log(`  Total time: ${((Date.now() - start) / 1000).toFixed(1)}s`);
