import { chainId, evmAddress, TimeWindow } from "@aave/client";
import { getSupplyAPYHistory } from "../lib/api";

type Input = {
  /**
   * The chain ID of the market to get the borrow APY history for.
   */
  chainId: number;
  /**
   * The address of the market to get the borrow APY history for.
   */
  marketAddress: string;
  /**
   * The address of the underlying token to get the borrow APY history for.
   */
  underlyingTokenAddress: string;
  /**
   * The window to get the average borrow APY history for.
   */
  window: TimeWindow;
};

export default async function (input: Input) {
  return getSupplyAPYHistory({
    chainId: chainId(input.chainId),
    market: evmAddress(input.marketAddress),
    underlyingToken: evmAddress(input.underlyingTokenAddress),
    window: input.window,
  });
}
