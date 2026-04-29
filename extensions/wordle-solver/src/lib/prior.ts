import { FREQ_RANK } from "../data/wordlists";
import { PRIOR_STEEPNESS, PRIOR_THRESHOLD } from "./constants";

export function priorWeight(rank: number, threshold = PRIOR_THRESHOLD, steepness = PRIOR_STEEPNESS): number {
  if (!Number.isFinite(rank)) return 0;
  return 1 / (1 + Math.exp((rank - threshold) / steepness));
}

export function buildPriors(words: readonly string[]): Float64Array {
  const w = new Float64Array(words.length);
  let sum = 0;
  for (let i = 0; i < words.length; i++) {
    const rank = FREQ_RANK.get(words[i]) ?? Infinity;
    const weight = priorWeight(rank);
    w[i] = weight;
    sum += weight;
  }
  if (sum === 0) {
    const flat = 1 / words.length;
    for (let i = 0; i < words.length; i++) w[i] = flat;
    return w;
  }
  for (let i = 0; i < words.length; i++) w[i] /= sum;
  return w;
}
