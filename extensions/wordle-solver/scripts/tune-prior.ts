import { ANSWERS, FREQ_RANK, GUESSES } from "../src/data/wordlists";
import { STARTER } from "../src/lib/constants";
import { ALL_GREEN_CODE, computePatternCode } from "../src/lib/pattern";
import { priorWeight } from "../src/lib/prior";
import { bestGuess, filterAnswers } from "../src/lib/solver";

type PriorConfig = {
  threshold: number;
  steepness: number;
};

type Metrics = {
  fixedPriorWeighted: number;
  selfPriorWeighted: number;
  uniform: number;
  maxTurns: number;
  failures: number;
  states: number;
  seconds: number;
};

const MAX_TURNS = 12;
const EVAL_PRIOR: PriorConfig = { threshold: 3000, steepness: 10 };
const configs: PriorConfig[] = [
  { threshold: 2000, steepness: 10 },
  { threshold: 2500, steepness: 10 },
  { threshold: 3000, steepness: 10 },
  { threshold: 3500, steepness: 10 },
  { threshold: 4000, steepness: 10 },
  { threshold: 2500, steepness: 100 },
  { threshold: 3000, steepness: 100 },
  { threshold: 3500, steepness: 100 },
  { threshold: 2500, steepness: 250 },
  { threshold: 3000, steepness: 250 },
  { threshold: 3500, steepness: 250 },
  { threshold: 2500, steepness: 500 },
  { threshold: 3000, steepness: 500 },
  { threshold: 3500, steepness: 500 },
  { threshold: 2500, steepness: 1000 },
  { threshold: 3000, steepness: 1000 },
  { threshold: 3500, steepness: 1000 },
];

for (const config of configs) {
  const metrics = benchmark(config);
  console.log(
    [
      `threshold=${config.threshold}`,
      `steepness=${config.steepness}`,
      `fixedPrior=${metrics.fixedPriorWeighted.toFixed(4)}`,
      `selfPrior=${metrics.selfPriorWeighted.toFixed(4)}`,
      `uniform=${metrics.uniform.toFixed(4)}`,
      `max=${metrics.maxTurns}`,
      `failures=${metrics.failures}`,
      `states=${metrics.states}`,
      `time=${metrics.seconds.toFixed(1)}s`,
    ].join("  "),
  );
}

function benchmark(config: PriorConfig): Metrics {
  const started = Date.now();
  const fixedAnswerPrior = buildPriorsWithConfig(ANSWERS, EVAL_PRIOR);
  const selfAnswerPrior = buildPriorsWithConfig(ANSWERS, config);
  const suggestionCache = new Map<string, string>();
  const turn2Lookup = buildTurn2Lookup(config);

  let uniformTurnSum = 0;
  let fixedPriorTurnSum = 0;
  let selfPriorTurnSum = 0;
  let maxTurns = 0;
  let failures = 0;

  for (let i = 0; i < ANSWERS.length; i++) {
    const turns = solveAnswer(ANSWERS[i], config, turn2Lookup, suggestionCache);
    if (!Number.isFinite(turns)) {
      failures++;
      continue;
    }

    uniformTurnSum += turns;
    fixedPriorTurnSum += turns * fixedAnswerPrior[i];
    selfPriorTurnSum += turns * selfAnswerPrior[i];
    maxTurns = Math.max(maxTurns, turns);
  }

  return {
    fixedPriorWeighted: fixedPriorTurnSum / sum(fixedAnswerPrior),
    selfPriorWeighted: selfPriorTurnSum / sum(selfAnswerPrior),
    uniform: uniformTurnSum / ANSWERS.length,
    maxTurns,
    failures,
    states: suggestionCache.size,
    seconds: (Date.now() - started) / 1000,
  };
}

function solveAnswer(
  answer: string,
  config: PriorConfig,
  turn2Lookup: ReadonlyMap<number, string>,
  suggestionCache: Map<string, string>,
): number {
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
      guess = turn2Lookup.get(patternCode) ?? computeSuggestion(candidates, config, suggestionCache);
      continue;
    }

    guess = computeSuggestion(candidates, config, suggestionCache);
  }

  return Infinity;
}

function buildTurn2Lookup(config: PriorConfig): Map<number, string> {
  const lookup = new Map<number, string>();

  for (let code = 0; code < 243; code++) {
    const filtered: string[] = [];
    for (const answer of ANSWERS) {
      if (computePatternCode(STARTER, answer) === code) filtered.push(answer);
    }

    if (filtered.length === 0) continue;
    lookup.set(code, filtered.length === 1 ? filtered[0] : computeSuggestion(filtered, config, new Map()));
  }

  return lookup;
}

function computeSuggestion(
  candidates: readonly string[],
  config: PriorConfig,
  suggestionCache: Map<string, string>,
): string {
  const key = candidates.join(",");
  const cached = suggestionCache.get(key);
  if (cached) return cached;

  const result = bestGuess(candidates, GUESSES, buildPriorsWithConfig(candidates, config));
  if (!result) throw new Error(`No suggestion for state ${key}`);

  suggestionCache.set(key, result.word);
  return result.word;
}

function buildPriorsWithConfig(words: readonly string[], config: PriorConfig): Float64Array {
  const weights = new Float64Array(words.length);
  let total = 0;
  for (let i = 0; i < words.length; i++) {
    const rank = FREQ_RANK.get(words[i]) ?? Infinity;
    const weight = priorWeight(rank, config.threshold, config.steepness);
    weights[i] = weight;
    total += weight;
  }

  if (total === 0) {
    const flat = 1 / words.length;
    for (let i = 0; i < weights.length; i++) weights[i] = flat;
    return weights;
  }

  for (let i = 0; i < weights.length; i++) weights[i] /= total;
  return weights;
}

function sum(values: Float64Array): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}
