import { encode } from "@nem035/gpt-3-encoder";

export function countToken(content: string) {
  return encode(content).length;
}

export function estimatedPrice(promptToken: number, outputToken: number, model: string) {
  // price is per 1M tokens in dollars, but we are measuring in cents. Hence the denominator is 10_000.
  // from https://openai.com/api/pricing

  let price = 0;
  if (model === "gpt-4o") {
    price = (promptToken * 5.0 + outputToken * 15.0) / 10_000;
  } else {
    price = -1;
  }
  return naiveRound(price, 3);
}

function naiveRound(value: number, decimalPlaces: number = 0) {
  const p = Math.pow(10, decimalPlaces);
  return Math.round(value * p) / p;
}
