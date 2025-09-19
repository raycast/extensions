import { AaveClient, ChainId, ChainsFilter } from "@aave/client";
import { chains, markets } from "@aave/client/actions";
import { formatApy, formatUSD, formatMarketName, titleCase } from "./format";
import { showFrozenOrPausedAssets } from "./preferences";

export const client = AaveClient.create();

export async function getChains() {
  const result = await chains(client, ChainsFilter.MAINNET_ONLY);
  if (result.isErr()) {
    throw new Error(result.error.message);
  }
  return result.value.map((chain) => ({
    id: chain.chainId,
    name: chain.name,
    icon: chain.icon,
    explorerUrl: chain.explorerUrl,
    isTestnet: chain.isTestnet,
    nativeWrappedToken: chain.nativeWrappedToken,
  }));
}

export async function getMarkets(chainIds: ChainId[]) {
  const result = await markets(client, {
    chainIds: chainIds.length > 0 ? chainIds : (await getChains()).map((chain) => chain.id),
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value.map((market) => {
    const size = parseFloat(market.totalMarketSize);
    const liquidity = parseFloat(market.totalAvailableLiquidity);
    const borrows = size - liquidity;

    return {
      id: market.name,
      icon: market.icon,
      address: market.address,
      name: formatMarketName(market.name),
      size: formatUSD(size),
      liquidity: formatUSD(liquidity),
      borrows: formatUSD(borrows),
      chain: {
        id: market.chain.chainId,
        name: market.chain.name,
        icon: market.chain.icon,
      },
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
            totalSupplied: formatUSD(
              parseFloat(reserve.supplyInfo.total.value ?? "0") * parseFloat(reserve.usdExchangeRate ?? "0"),
            ),
            totalBorrowed: formatUSD(parseFloat(reserve.borrowInfo?.total.usd ?? "0")),
            supplyAPY: {
              protocol: formatApy(protocolSupplyApy),
              merit: formatApy(meritSupplyApy),
              total: formatApy(totalSupplyApy),
            },
            borrowAPY: {
              protocol: formatApy(protocolBorrowApy),
              merit: formatApy(meritBorrowApy),
              total: formatApy(totalBorrowApy),
            },
            url: `https://app.aave.com/reserve-overview/?underlyingAsset=${reserve.underlyingToken.address.toLowerCase()}&marketName=${marketName}`,
            isPaused: reserve.isPaused,
            isFrozen: reserve.isFrozen,
            usdExchangeRate: parseFloat(reserve.usdExchangeRate ?? "0"),
          };
        }),
    };
  });
}
