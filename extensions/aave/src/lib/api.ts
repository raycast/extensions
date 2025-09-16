import { AaveClient, ChainId, ChainsFilter } from "@aave/client";
import { chains, markets } from "@aave/client/actions";
import { formatApy, formatCompactNumber, titleCase } from "./format";
import { showFrozenOrPausedAssets } from "./preferences";

export const client = AaveClient.create();

export async function getChains() {
  const result = await chains(client, ChainsFilter.MAINNET_ONLY);
  if (result.isErr()) {
    throw new Error(result.error.message);
  }
  return result.value;
}

export async function getMarkets(chainIds: ChainId[]) {
  const result = await markets(client, { chainIds });
  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value.map((market) => ({
    address: market.address,
    name: titleCase(market.name),
    reserves: market.supplyReserves
      .filter((reserve) => {
        if (showFrozenOrPausedAssets) {
          return true;
        }

        return !reserve.isFrozen && !reserve.isPaused;
      })
      .map((reserve) => {
        const baseSupplyApy = parseFloat(reserve.supplyInfo?.apy.value ?? "0");
        const baseBorrowApy = parseFloat(reserve.borrowInfo?.apy.value ?? "0");

        const meritBorrowApy = reserve.incentives
          .filter((i) => i.__typename === "MeritBorrowIncentive" || i.__typename === "AaveBorrowIncentive")
          .map((i) => parseFloat(i.borrowAprDiscount.value))
          .reduce((acc, curr) => acc + curr, 0);

        const meritSupplyApy = reserve.incentives
          .filter((i) => i.__typename === "MeritSupplyIncentive" || i.__typename === "AaveSupplyIncentive")
          .map((i) => parseFloat(i.extraSupplyApr.value))
          .reduce((acc, curr) => acc + curr, 0);

        const finalSupplyApy = baseSupplyApy + meritSupplyApy;
        const finalBorrowApy = baseBorrowApy - meritBorrowApy;

        const marketVersion = /\d+/.exec(market.name)?.[0];
        const marketName = `proto_${titleCase(market.name).split(" ").at(-1)?.toLowerCase()}_v${marketVersion}`;

        return {
          underlyingToken: {
            address: reserve.underlyingToken.address,
            name: reserve.underlyingToken.name,
            symbol: reserve.underlyingToken.symbol,
            icon: reserve.underlyingToken.imageUrl,
          },
          totalSupply:
            "$" +
            formatCompactNumber(
              parseFloat(reserve.supplyInfo.total.value ?? "0") * parseFloat(reserve.usdExchangeRate ?? "0"),
            ),
          totalBorrow: "$" + formatCompactNumber(parseFloat(reserve.borrowInfo?.total.usd ?? "0")),
          baseSupplyApy: formatApy(baseSupplyApy),
          meritSupplyApy: formatApy(meritSupplyApy),
          finalSupplyApy: formatApy(finalSupplyApy),
          baseBorrowApy: formatApy(baseBorrowApy),
          meritBorrowApy: formatApy(meritBorrowApy),
          finalBorrowApy: formatApy(finalBorrowApy),
          url: `https://app.aave.com/reserve-overview/?underlyingAsset=${reserve.underlyingToken.address.toLowerCase()}&marketName=${marketName}`,
          chain: {
            id: market.chain.chainId,
            name: market.chain.name,
            icon: market.chain.icon,
          },
        };
      }),
  }));
}
