import { AaveClient, ChainId, ChainsFilter } from "@aave/client";
import { chains, markets } from "@aave/client/actions";
import { formatApy, formatCompactNumber, formatMarketName, titleCase } from "./format";
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

  return result.value.map((market) => {
    const size = parseFloat(market.totalMarketSize);
    const liquidity = parseFloat(market.totalAvailableLiquidity);
    const borrows = size - liquidity;

    return {
      address: market.address,
      name: formatMarketName(market.name),
      size: formatCompactNumber(size),
      liquidity: formatCompactNumber(liquidity),
      borrows: formatCompactNumber(borrows),
      reserves: market.supplyReserves
        .filter((reserve) => {
          if (showFrozenOrPausedAssets) {
            return true;
          }

          return !reserve.isFrozen && !reserve.isPaused;
        })
        .map((reserve) => {
          const protocolSupplyApy = parseFloat(reserve.supplyInfo?.apy.value ?? "0");
          const protocolBorrowApy = parseFloat(reserve.borrowInfo?.apy.value ?? "0");

          const meritBorrowApy =
            -1 *
            reserve.incentives
              .filter((i) => i.__typename === "MeritBorrowIncentive" || i.__typename === "AaveBorrowIncentive")
              .map((i) => parseFloat(i.borrowAprDiscount.value))
              .reduce((acc, curr) => acc + curr, 0);
          const meritSupplyApy = reserve.incentives
            .filter((i) => i.__typename === "MeritSupplyIncentive" || i.__typename === "AaveSupplyIncentive")
            .map((i) => parseFloat(i.extraSupplyApr.value))
            .reduce((acc, curr) => acc + curr, 0);

          const totalSupplyApy = protocolSupplyApy + meritSupplyApy;
          const totalBorrowApy = protocolBorrowApy + meritBorrowApy;

          const marketVersion = /\d+/.exec(market.name)?.[0];
          const marketName = `proto_${titleCase(market.name).split(" ").at(-1)?.toLowerCase()}_v${marketVersion}`;

          return {
            underlyingToken: {
              address: reserve.underlyingToken.address,
              name: reserve.underlyingToken.name,
              symbol: reserve.underlyingToken.symbol,
              icon: reserve.underlyingToken.imageUrl,
            },
            interestBearingToken: {
              address: reserve.aToken.address,
              name: reserve.aToken.name,
              symbol: reserve.aToken.symbol,
            },
            variableDebtToken: {
              address: reserve.vToken.address,
              name: reserve.vToken.name,
              symbol: reserve.vToken.symbol,
            },
            totalSupply:
              "$" +
              formatCompactNumber(
                parseFloat(reserve.supplyInfo.total.value ?? "0") * parseFloat(reserve.usdExchangeRate ?? "0"),
              ),
            totalBorrow: "$" + formatCompactNumber(parseFloat(reserve.borrowInfo?.total.usd ?? "0")),
            protocolSupplyApy: formatApy(protocolSupplyApy),
            meritSupplyApy: formatApy(meritSupplyApy),
            totalSupplyApy: formatApy(totalSupplyApy),
            protocolBorrowApy: formatApy(protocolBorrowApy),
            meritBorrowApy: formatApy(meritBorrowApy),
            totalBorrowApy: formatApy(totalBorrowApy),
            url: `https://app.aave.com/reserve-overview/?underlyingAsset=${reserve.underlyingToken.address.toLowerCase()}&marketName=${marketName}`,
            isPaused: reserve.isPaused,
            isFrozen: reserve.isFrozen,
            chain: {
              id: market.chain.chainId,
              name: market.chain.name,
              icon: market.chain.icon,
            },
          };
        }),
    };
  });
}
