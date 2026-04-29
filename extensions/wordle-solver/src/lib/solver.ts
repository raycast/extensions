import { ALL_GREEN_CODE, computePatternCode } from "./pattern";
import type { PatternCode } from "./types";
import { FREQ_RANK } from "../data/wordlists";
import { ENDGAME_CANDIDATE_LIMIT, ENTROPY_ANSWER_PROBABILITY_BONUS } from "./constants";

const EPSILON = 1e-9;

type GuessScore = {
  word: string;
  entropy: number;
  expectedTurns?: number;
};

export function filterAnswers(candidates: readonly string[], guess: string, patternCode: PatternCode): string[] {
  const out: string[] = [];
  for (const c of candidates) {
    if (computePatternCode(guess, c) === patternCode) out.push(c);
  }
  return out;
}

export function expectedEntropy(guess: string, candidates: readonly string[], weights: Float64Array): number {
  const buckets = new Float64Array(243);
  for (let i = 0; i < candidates.length; i++) {
    const code = computePatternCode(guess, candidates[i]);
    buckets[code] += weights[i];
  }
  let h = 0;
  const LN2 = Math.LN2;
  for (let i = 0; i < 243; i++) {
    const p = buckets[i];
    if (p > 0) h -= (p * Math.log(p)) / LN2;
  }
  return h;
}

export function bestGuess(
  candidates: readonly string[],
  guessPool: readonly string[],
  weights: Float64Array,
): GuessScore | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return { word: candidates[0], entropy: 0 };

  if (candidates.length <= ENDGAME_CANDIDATE_LIMIT) {
    return bestEndgameGuess(candidates, guessPool, weights);
  }

  return bestEntropyGuess(candidates, guessPool, weights);
}

export function bestEntropyGuess(
  candidates: readonly string[],
  guessPool: readonly string[],
  weights: Float64Array,
): GuessScore | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return { word: candidates[0], entropy: 0 };

  const candidateWeight = new Map<string, number>();
  for (let i = 0; i < candidates.length; i++) candidateWeight.set(candidates[i], weights[i]);

  let bestWord = "";
  let bestScore = -Infinity;
  let bestEntropy = -Infinity;
  let bestInCandidates = false;
  let bestRank = Infinity;

  for (const guess of guessPool) {
    const h = expectedEntropy(guess, candidates, weights);
    const answerProbability = candidateWeight.get(guess) ?? 0;
    const score = h + ENTROPY_ANSWER_PROBABILITY_BONUS * answerProbability;
    const inCandidates = answerProbability > 0;
    const rank = FREQ_RANK.get(guess) ?? Infinity;

    if (
      score > bestScore + EPSILON ||
      (Math.abs(score - bestScore) <= EPSILON &&
        (preferInCandidate(inCandidates, bestInCandidates) ||
          (inCandidates === bestInCandidates &&
            (h > bestEntropy + EPSILON || (Math.abs(h - bestEntropy) <= EPSILON && rank < bestRank)))))
    ) {
      bestWord = guess;
      bestScore = score;
      bestEntropy = h;
      bestInCandidates = inCandidates;
      bestRank = rank;
    }
  }

  return { word: bestWord, entropy: bestEntropy };
}

export function bestEndgameGuess(
  candidates: readonly string[],
  guessPool: readonly string[],
  weights: Float64Array,
): GuessScore | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return { word: candidates[0], entropy: 0, expectedTurns: 1 };

  const normalized = normalizeWeights(weights);
  const candidateSet = new Set(candidates);
  const memo = new Map<string, number>();

  let bestWord = "";
  let bestExpectedTurns = Infinity;
  let bestEntropy = -Infinity;
  let bestInCandidates = false;
  let bestRank = Infinity;

  for (const guess of guessPool) {
    const expectedTurns = expectedTurnsForGuess(guess, candidates, normalized, guessPool, memo);
    if (!Number.isFinite(expectedTurns)) continue;

    const entropy = expectedEntropy(guess, candidates, normalized);
    const inCandidates = candidateSet.has(guess);
    const rank = FREQ_RANK.get(guess) ?? Infinity;

    if (
      expectedTurns < bestExpectedTurns - EPSILON ||
      (Math.abs(expectedTurns - bestExpectedTurns) <= EPSILON &&
        (preferInCandidate(inCandidates, bestInCandidates) ||
          (inCandidates === bestInCandidates &&
            (entropy > bestEntropy + EPSILON || (Math.abs(entropy - bestEntropy) <= EPSILON && rank < bestRank)))))
    ) {
      bestWord = guess;
      bestExpectedTurns = expectedTurns;
      bestEntropy = entropy;
      bestInCandidates = inCandidates;
      bestRank = rank;
    }
  }

  if (!bestWord) return bestEntropyGuess(candidates, guessPool, normalized);
  return { word: bestWord, entropy: bestEntropy, expectedTurns: bestExpectedTurns };
}

function solveExpectedTurns(
  candidates: readonly string[],
  weights: Float64Array,
  guessPool: readonly string[],
  memo: Map<string, number>,
): number {
  if (candidates.length <= 1) return 1;

  const key = memoKey(candidates, weights);
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  let best = Infinity;
  for (const guess of guessPool) {
    const turns = expectedTurnsForGuess(guess, candidates, weights, guessPool, memo);
    if (turns < best) best = turns;
  }

  memo.set(key, best);
  return best;
}

function expectedTurnsForGuess(
  guess: string,
  candidates: readonly string[],
  weights: Float64Array,
  guessPool: readonly string[],
  memo: Map<string, number>,
): number {
  const buckets = new Map<PatternCode, { words: string[]; weights: number[]; mass: number }>();

  for (let i = 0; i < candidates.length; i++) {
    const code = computePatternCode(guess, candidates[i]);
    let bucket = buckets.get(code);
    if (!bucket) {
      bucket = { words: [], weights: [], mass: 0 };
      buckets.set(code, bucket);
    }
    bucket.words.push(candidates[i]);
    bucket.weights.push(weights[i]);
    bucket.mass += weights[i];
  }

  if (buckets.size === 1 && !buckets.has(ALL_GREEN_CODE)) return Infinity;

  let expected = 1;
  for (const [code, bucket] of buckets) {
    if (code === ALL_GREEN_CODE) continue;
    if (bucket.words.length === candidates.length) return Infinity;

    const subWeights = normalizeWeights(bucket.weights);
    expected += bucket.mass * solveExpectedTurns(bucket.words, subWeights, guessPool, memo);
  }

  return expected;
}

function normalizeWeights(weights: ArrayLike<number>): Float64Array {
  const out = new Float64Array(weights.length);
  let sum = 0;
  for (let i = 0; i < weights.length; i++) sum += weights[i];

  if (sum === 0) {
    const flat = 1 / weights.length;
    for (let i = 0; i < weights.length; i++) out[i] = flat;
    return out;
  }

  for (let i = 0; i < weights.length; i++) out[i] = weights[i] / sum;
  return out;
}

function memoKey(candidates: readonly string[], weights: Float64Array): string {
  let key = "";
  for (let i = 0; i < candidates.length; i++) {
    if (i > 0) key += ",";
    key += `${candidates[i]}:${weights[i].toPrecision(12)}`;
  }
  return key;
}

function preferInCandidate(inCandidates: boolean, bestInCandidates: boolean): boolean {
  return inCandidates && !bestInCandidates;
}
