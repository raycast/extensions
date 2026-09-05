import { Tokens } from "./types";

/**
 * USD per 1M tokens. These numbers are only used as *relative* weights: the
 * forecast calibrates absolute scale against the real utilization the API
 * reports, so a uniform pricing error cancels out. Only the ratios between
 * models and between token kinds actually matter.
 */
interface Price {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
}

const OPUS: Price = {
  input: 15,
  output: 75,
  cacheWrite5m: 18.75,
  cacheWrite1h: 30,
  cacheRead: 1.5,
};
const SONNET: Price = {
  input: 3,
  output: 15,
  cacheWrite5m: 3.75,
  cacheWrite1h: 6,
  cacheRead: 0.3,
};
const HAIKU: Price = {
  input: 1,
  output: 5,
  cacheWrite5m: 1.25,
  cacheWrite1h: 2,
  cacheRead: 0.1,
};

export function priceFor(model: string | undefined): Price {
  const m = (model ?? "").toLowerCase();
  if (m.includes("opus")) return OPUS;
  if (m.includes("haiku")) return HAIKU;
  // Fable has no published price; it behaves like a small fast model, so weight it as Haiku.
  if (m.includes("fable")) return HAIKU;
  return SONNET;
}

export function costOf(model: string | undefined, t: Tokens): number {
  const p = priceFor(model);
  return (
    (t.input * p.input +
      t.output * p.output +
      t.cacheWrite5m * p.cacheWrite5m +
      t.cacheWrite1h * p.cacheWrite1h +
      t.cacheRead * p.cacheRead) /
    1_000_000
  );
}

export function emptyTokens(): Tokens {
  return {
    input: 0,
    output: 0,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
    cacheRead: 0,
  };
}
