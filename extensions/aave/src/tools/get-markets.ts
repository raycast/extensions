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

  return getMarkets(chainIds);
}
