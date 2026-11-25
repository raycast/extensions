import { encode } from "@nem035/gpt-3-encoder";

export function countToken(content: string) {
  return encode(content).length;
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
