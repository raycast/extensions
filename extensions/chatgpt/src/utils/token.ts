import { encode } from "@nem035/gpt-3-encoder";

function naiveRound(num: number, decimalPlaces = 0) {
  const p = Math.pow(10, decimalPlaces);
  return Math.round(num * p) / p;
}

export function countToken(content: string) {
  return encode(content).length;
}

export function estimatePrice(prompt_token: number, output_token: number, model: string) {
  let price = 0;
  switch (model) {
    case "gpt-4o":
      // The input costs are $5, while the output is $15.
      price = ((prompt_token * 5) / 1_000_000 + (output_token * 15) / 1_000_000) * 100;
      break;
    default:
      break;
  }
  return naiveRound(price, 5);
}
export function countImageTokens(width: number, height: number): number {
  const baseTokens = 85;
  const tokensPerTile = 170;
  const tileSize = 512;

  // Calculate the number of tiles
  const tilesX = Math.ceil(width / tileSize);
  const tilesY = Math.ceil(height / tileSize);
  const totalTiles = tilesX * tilesY;

  // Calculate the total tokens
  const totalTokens = baseTokens + tokensPerTile * totalTiles;

  return totalTokens;
}

export function estimateImagePrice(totalTokens: number): number {
  const tokenCostPerMillion = 5.0;

  // Calculate the total cost
  const totalCost = (totalTokens / 1_000_000) * tokenCostPerMillion;

  return totalCost;
}
