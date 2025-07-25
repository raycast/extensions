import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  List,
  openExtensionPreferences,
} from '@raycast/api'
import { Effect, pipe, Stream } from 'effect'
import { useEffect, useState } from 'react'
import { PortfolioStreamService } from './bitvavo/PortfolioStreamService.js'
import { run } from './bitvavo/Runtime.js'
import type { Summary } from './bitvavo/schema.js'
import {
  formatCurrency,
  formatSignedCurrencyWithColor,
  formatSignedPercentageWithColor,
  getCryptocurrencyIcon,
} from './utils.js'

type SummaryType = typeof Summary.Type

interface Preferences {
  bitvavoApiKey: string
  bitvavoApiSecret: string
}

export default function Portfolio() {
  const [summary, setSummary] = useState<SummaryType | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const preferences = getPreferenceValues<Preferences>()

  const loadPortfolio = () =>
    run(
      new Map([
        ['BITVAVO_API_REST_URL', 'https://api.bitvavo.com/v2'],
        ['BITVAVO_API_WS_URL', 'wss://ws.bitvavo.com/v2/'],
        ['BITVAVO_API_KEY', preferences.bitvavoApiKey],
        ['BITVAVO_API_SECRET', preferences.bitvavoApiSecret],
      ]),
    )(
      Effect.gen(function* () {
        const stream = yield* PortfolioStreamService.setup()
        yield* pipe(
          stream,
          Stream.tap(summary => Effect.sync(() => setSummary(summary))),
          Stream.runDrain,
        )
      }).pipe(Effect.catchAll(err => Effect.sync(() => setError(err.message)))),
    )

  useEffect(() => {
    loadPortfolio()
  }, [true])

  useEffect(() => {
    setIsLoading(!summary)
  }, [summary])

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    )
  }

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Search assets..."
    >
      {summary?.assets.map(asset => {
        const currencySymbol = '€'
        const iconPath = getCryptocurrencyIcon(asset.symbol)
        return (
          <List.Item
            key={asset.symbol}
            title={asset.symbol}
            icon={iconPath}
            accessories={[
              {
                text: {
                  value: formatCurrency(asset.currentPrice, currencySymbol),
                  color: Color.SecondaryText,
                },
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Current Price"
                      text={formatCurrency(asset.currentPrice, currencySymbol)}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Average Buy Price"
                      text={formatCurrency(
                        asset.averageBuyPrice,
                        currencySymbol,
                      )}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Balance"
                      text={asset.currentBalance.toString()}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Invested"
                      text={formatCurrency(asset.totalInvested, currencySymbol)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Current Value"
                      text={formatCurrency(asset.totalValue, currencySymbol)}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Gain/Loss"
                      text={formatSignedCurrencyWithColor(
                        asset.gainLoss,
                        currencySymbol,
                      )}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Gain/Loss %"
                      text={formatSignedPercentageWithColor(
                        asset.gainLossPercent,
                      )}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        )
      })}
      {!isLoading && summary && (
        <List.Item
          key="totals"
          title="Totals"
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Total Value"
                    text={formatCurrency(summary.totals.currentValue)}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Invested"
                    text={formatCurrency(summary.totals.invested)}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Gain/Loss"
                    text={formatSignedCurrencyWithColor(
                      summary.totals.gainLoss,
                      '€',
                    )}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Gain/Loss %"
                    text={formatSignedPercentageWithColor(
                      summary.totals.gainLossPercent,
                    )}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      )}
    </List>
  )
}
