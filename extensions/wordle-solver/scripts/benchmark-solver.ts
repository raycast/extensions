import { ANSWERS, GUESSES } from "../src/data/wordlists";
import { STARTER, TURN2_LOOKUP } from "../src/lib/constants";
import { ALL_GREEN_CODE, computePatternCode, patternCodeToKey } from "../src/lib/pattern";
import { buildPriors } from "../src/lib/prior";
import { bestGuess, filterAnswers } from "../src/lib/solver";

type CachedSuggestion = {
  word: string;
  entropy: number;
  expectedTurns?: number;
  elapsedMs: number;
};

const MAX_TURNS = 12;

const answerPrior = buildPriors(ANSWERS);
const suggestionCache = new Map<string, CachedSuggestion>();
const turnThreeStateKeys = new Set<string>();

let uniformTurnSum = 0;
let priorTurnSum = 0;
let maxTurns = 0;
let failures = 0;

const started = Date.now();

for (let i = 0; i < ANSWERS.length; i++) {
  const answer = ANSWERS[i];
  const turns = solveAnswer(answer);

  if (!Number.isFinite(turns)) {
    failures++;
    continue;
  }

  uniformTurnSum += turns;
  priorTurnSum += turns * answerPrior[i];
  maxTurns = Math.max(maxTurns, turns);
}

const turnThreeTimings = Array.from(turnThreeStateKeys, (key) => suggestionCache.get(key)?.elapsedMs ?? 0).sort(
  (a, b) => a - b,
);

console.log(`Benchmarked ${ANSWERS.length} answers with ${suggestionCache.size} computed states.`);
console.log(`Prior-weighted expected turns: ${(priorTurnSum / priorMass()).toFixed(4)}`);
console.log(`Uniform expected turns:        ${(uniformTurnSum / ANSWERS.length).toFixed(4)}`);
console.log(`Max turns observed:            ${maxTurns}`);
console.log(`Failures:                      ${failures}`);
console.log(`Turn-three states:             ${turnThreeTimings.length}`);
console.log(`Turn-three avg runtime:        ${average(turnThreeTimings).toFixed(2)}ms`);
console.log(`Turn-three p95 runtime:        ${percentile(turnThreeTimings, 0.95).toFixed(2)}ms`);
console.log(`Total benchmark time:          ${((Date.now() - started) / 1000).toFixed(1)}s`);

function solveAnswer(answer: string): number {
  let turns = 1;
  let guess = STARTER;
  let candidates: readonly string[] = ANSWERS;

  while (turns <= MAX_TURNS) {
    const patternCode = computePatternCode(guess, answer);
    if (patternCode === ALL_GREEN_CODE) return turns;

    candidates = filterAnswers(candidates, guess, patternCode);
    if (candidates.length === 0) return Infinity;

    turns++;

    if (turns === 2 && guess === STARTER) {
      const lookup = TURN2_LOOKUP[patternCodeToKey(patternCode)];
      guess = lookup ?? computeSuggestion(candidates).word;
      continue;
    }

    const key = stateKey(candidates);
    if (turns === 3) turnThreeStateKeys.add(key);
    guess = computeSuggestion(candidates).word;
  }

  return Infinity;
}

function computeSuggestion(candidates: readonly string[]): CachedSuggestion {
  const key = stateKey(candidates);
  const cached = suggestionCache.get(key);
  if (cached) return cached;

  const t0 = performance.now();
  const result = bestGuess(candidates, GUESSES, buildPriors(candidates));
  if (!result) throw new Error(`No suggestion for state ${key}`);

  const suggestion = {
    ...result,
    elapsedMs: performance.now() - t0,
  };
  suggestionCache.set(key, suggestion);
  return suggestion;
}

function stateKey(candidates: readonly string[]): string {
  return candidates.join(",");
}

function priorMass(): number {
  let sum = 0;
  for (const p of answerPrior) sum += p;
  return sum;
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  return values[Math.min(values.length - 1, Math.floor((values.length - 1) * p))];
}
