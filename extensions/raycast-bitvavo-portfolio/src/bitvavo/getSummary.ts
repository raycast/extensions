import { Array, pipe } from 'effect'
import {
  divide,
  enableBoundaryChecking,
  minus,
  plus,
  times,
  round,
} from 'number-precision'
import { Asset, Balance, Summary, Trades } from './schema'

enableBoundaryChecking(false)

export const getSummary =
  (balance: typeof Balance.Type, allTrades: typeof Trades.Type) =>
  (currentPrices: Map<string, number>) =>
    pipe(
      Array.map(balance, balance => {
        const symbol = balance.symbol
        const market = `${symbol}-EUR`
        const currentBalance = parseFloat(balance.available)

        const currentPrice = currentPrices.get(market) ?? 0

        // Determine trades for this asset
        const trades = pipe(
          allTrades,
          Array.filter(trade => trade.market === market),
          Array.filter(trade => trade.side === 'buy'),
        )

        // Calculate total purchased
        const totalPurchased = Array.reduce(trades, 0, (acc, trade) =>
          plus(acc, parseFloat(trade.amount)),
        )

        // Calculate total invested
        const totalInvested = Array.reduce(trades, 0, (acc, trade) =>
          plus(acc, times(parseFloat(trade.amount), parseFloat(trade.price))),
        )

        // Calculate the weigthed average buy price.
        const averageBuyPrice = pipe(
          trades,
          Array.reduce(0, (acc, trade) =>
            plus(
              acc,
              divide(
                times(parseFloat(trade.amount), parseFloat(trade.price)),
                totalPurchased,
              ),
            ),
          ),
        )

        // Calculate current value and gains/losses
        const totalValue = times(currentBalance, currentPrice)
        const gainLoss = minus(totalValue, totalInvested)
        const gainLossPercent =
          totalInvested > 0
            ? round(times(divide(gainLoss, totalInvested), 100), 2)
            : 0

        return Asset.make({
          symbol,
          market,
          currentBalance,
          averageBuyPrice,
          currentPrice,
          totalValue,
          totalInvested,
          gainLoss,
          gainLossPercent,
        })
      }),
      assets => {
        const invested = Array.reduce(assets, 0, (acc, asset) =>
          plus(acc, asset.totalInvested),
        )
        const currentValue = Array.reduce(assets, 0, (acc, asset) =>
          plus(acc, asset.totalValue),
        )
        const gainLoss = minus(currentValue, invested)
        const rawGainLossPercent =
          invested > 0 ? times(divide(gainLoss, invested), 100) : 0
        const gainLossPercent = round(rawGainLossPercent, 2)

        return Summary.make({
          totals: {
            invested,
            currentValue,
            gainLoss,
            gainLossPercent,
          },
          assets: assets,
        })
      },
    )
