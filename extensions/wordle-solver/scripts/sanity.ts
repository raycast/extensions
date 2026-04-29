import { ANSWERS, GUESSES } from "../src/data/wordlists";
import { buildPriors } from "../src/lib/prior";
import { bestGuess } from "../src/lib/solver";

if (ANSWERS.length === 0 || GUESSES.length === 0) {
  console.error("✗ Wordlists are empty. Run `npm run build:data` first.");
  process.exit(1);
}

console.log(`Computing best opening guess over ${ANSWERS.length} answers, ${GUESSES.length} guesses…`);
const t0 = Date.now();
const weights = buildPriors(ANSWERS);
const result = bestGuess(ANSWERS, GUESSES, weights);
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\nBest opener: ${result?.word.toUpperCase()}`);
console.log(`Entropy:     ${result?.entropy.toFixed(4)} bits`);
console.log(`Time:        ${elapsed}s`);
