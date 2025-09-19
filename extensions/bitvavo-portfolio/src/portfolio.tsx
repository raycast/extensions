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
  getUserFriendlyErrorMessage,
  validateApiCredentials,
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

  const loadPortfolio = () => {
    const validationError = validateApiCredentials(
      preferences.bitvavoApiKey,
      preferences.bitvavoApiSecret,
    )
    if (validationError) {
      setError(validationError)
      return
    }

    return run(
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
      }).pipe(
        Effect.catchAll(err =>
          Effect.sync(() => {
            const userFriendlyMessage = getUserFriendlyErrorMessage(err.message)
            setError(userFriendlyMessage)
          }),
        ),
      ),
    )
  }

  useEffect(() => {
    loadPortfolio()
  }, [])

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
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      {!isLoading && (!summary?.assets || summary.assets.length === 0) && (
        <List.EmptyView
          title="No Assets Found"
          description="Your portfolio appears to be empty or no assets were found with balances"
        />
      )}
      {summary?.assets.map(asset => {
        const iconPath = getCryptocurrencyIcon(asset.symbol)
        return (
          <List.Item
            key={asset.symbol}
            title={asset.symbol}
            icon={iconPath}
            accessories={[
              {
                text: {
                  value: formatCurrency(asset.currentPrice),
                  color: Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open Extension Preferences"
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Current Price"
                      text={formatCurrency(asset.currentPrice)}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Average Buy Price"
                      text={formatCurrency(asset.averageBuyPrice)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Balance"
                      text={asset.currentBalance.toString()}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Invested"
                      text={formatCurrency(asset.totalInvested)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Current Value"
                      text={formatCurrency(asset.totalValue)}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Gain/Loss"
                      text={formatSignedCurrencyWithColor(asset.gainLoss)}
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
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
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
