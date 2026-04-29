import { ANSWERS, FREQ_RANK, GUESSES } from "../src/data/wordlists";
import { ENDGAME_CANDIDATE_LIMIT, STARTER } from "../src/lib/constants";
import { ALL_GREEN_CODE, computePatternCode } from "../src/lib/pattern";
import { buildPriors } from "../src/lib/prior";
import { bestEndgameGuess, expectedEntropy, filterAnswers } from "../src/lib/solver";

type Metrics = {
  priorWeighted: number;
  uniform: number;
  maxTurns: number;
  failures: number;
  states: number;
  seconds: number;
};

const MAX_TURNS = 12;
const bonuses = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1, 1.5, 2, 3];

for (const bonus of bonuses) {
  const metrics = benchmark(bonus);
  console.log(
    [
      `bonus=${bonus}`,
      `prior=${metrics.priorWeighted.toFixed(4)}`,
      `uniform=${metrics.uniform.toFixed(4)}`,
      `max=${metrics.maxTurns}`,
      `failures=${metrics.failures}`,
      `states=${metrics.states}`,
      `time=${metrics.seconds.toFixed(1)}s`,
    ].join("  "),
  );
}

function benchmark(answerBonus: number): Metrics {
  const started = Date.now();
  const answerPrior = buildPriors(ANSWERS);
  const suggestionCache = new Map<string, string>();
  const turn2Lookup = buildTurn2Lookup(answerBonus);

  let uniformTurnSum = 0;
  let priorTurnSum = 0;
  let maxTurns = 0;
  let failures = 0;

  for (let i = 0; i < ANSWERS.length; i++) {
    const turns = solveAnswer(ANSWERS[i], answerBonus, turn2Lookup, suggestionCache);
    if (!Number.isFinite(turns)) {
      failures++;
      continue;
    }

    uniformTurnSum += turns;
    priorTurnSum += turns * answerPrior[i];
    maxTurns = Math.max(maxTurns, turns);
  }

  return {
    priorWeighted: priorTurnSum / sum(answerPrior),
    uniform: uniformTurnSum / ANSWERS.length,
    maxTurns,
    failures,
    states: suggestionCache.size,
    seconds: (Date.now() - started) / 1000,
  };
}

function solveAnswer(
  answer: string,
  answerBonus: number,
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
      guess = turn2Lookup.get(patternCode) ?? computeSuggestion(candidates, answerBonus, suggestionCache);
      continue;
    }

    guess = computeSuggestion(candidates, answerBonus, suggestionCache);
  }

  return Infinity;
}

function buildTurn2Lookup(answerBonus: number): Map<number, string> {
  const lookup = new Map<number, string>();

  for (let code = 0; code < 243; code++) {
    const filtered: string[] = [];
    for (const answer of ANSWERS) {
      if (computePatternCode(STARTER, answer) === code) filtered.push(answer);
    }

    if (filtered.length === 0) continue;
    lookup.set(code, filtered.length === 1 ? filtered[0] : computeSuggestion(filtered, answerBonus, new Map()));
  }

  return lookup;
}

function computeSuggestion(
  candidates: readonly string[],
  answerBonus: number,
  suggestionCache: Map<string, string>,
): string {
  const key = `${answerBonus}|${candidates.join(",")}`;
  const cached = suggestionCache.get(key);
  if (cached) return cached;

  const weights = buildPriors(candidates);
  const result =
    candidates.length <= ENDGAME_CANDIDATE_LIMIT
      ? bestEndgameGuess(candidates, GUESSES, weights)
      : bestEntropyGuessWithAnswerBonus(candidates, GUESSES, weights, answerBonus);
  if (!result) throw new Error(`No suggestion for state ${key}`);

  const word = typeof result === "string" ? result : result.word;
  suggestionCache.set(key, word);
  return word;
}

function bestEntropyGuessWithAnswerBonus(
  candidates: readonly string[],
  guessPool: readonly string[],
  weights: Float64Array,
  answerBonus: number,
): string | null {
  const candidateWeight = new Map<string, number>();
  for (let i = 0; i < candidates.length; i++) candidateWeight.set(candidates[i], weights[i]);

  let bestWord = "";
  let bestScore = -Infinity;
  let bestEntropy = -Infinity;
  let bestInCandidates = false;
  let bestRank = Infinity;

  for (const guess of guessPool) {
    const entropy = expectedEntropy(guess, candidates, weights);
    const answerProbability = candidateWeight.get(guess) ?? 0;
    const score = entropy + answerBonus * answerProbability;
    const inCandidates = answerProbability > 0;
    const rank = FREQ_RANK.get(guess) ?? Infinity;

    if (
      score > bestScore + 1e-9 ||
      (Math.abs(score - bestScore) <= 1e-9 &&
        ((inCandidates && !bestInCandidates) ||
          (inCandidates === bestInCandidates &&
            (entropy > bestEntropy + 1e-9 || (Math.abs(entropy - bestEntropy) <= 1e-9 && rank < bestRank)))))
    ) {
      bestWord = guess;
      bestScore = score;
      bestEntropy = entropy;
      bestInCandidates = inCandidates;
      bestRank = rank;
    }
  }

  return bestWord || null;
}

function sum(values: Float64Array): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}
