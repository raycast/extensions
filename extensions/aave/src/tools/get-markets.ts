import { ChainId, chainId } from "@aave/client";
import { getMarkets } from "../lib/api";

type Input = {
  /**
   * List of chain IDs to search for markets. Leave empty to search all chains.
   */
  chainIds?: number[];
};

export default async function (input: Input) {
  let chainIds: ChainId[] = [];

  if (input.chainIds && input.chainIds.length > 0) {
    chainIds = input.chainIds.map((id) => chainId(id));
  }

  const markets = await getMarkets(chainIds);

  return markets.map((market) => ({
    ...market,
    // Simplify the reserve object for LLMs
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    reserves: market.reserves.map(({ url, variableDebtToken, interestBearingToken, ...reserve }) => reserve),
  }));
}
