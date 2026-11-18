import { growthOverview, readAtlasHistory, readyMintCLI } from "../mint-ai";

type Input = {
  /** How many days back to compare, from 1 to 30. Use 7 unless the person names a period. */
  days?: number;
};

/**
 * What grew on the Mac's disk over the last days, by app or folder and by
 * category, from the maps Mint keeps after each Scan. Read-only.
 */
export default async function tool(input: Input) {
  readyMintCLI();
  const days = Math.min(30, Math.max(1, Math.round(input.days ?? 7)));
  return growthOverview(await readAtlasHistory(), days);
}
