/**
 * Wise/TransferWise command for international transfers.
 */

import { Action, ActionPanel, List, Icon, Color, useNavigation } from "@raycast/api";
import { useBunqSession, withSessionRefresh } from "./hooks/useBunqSession";
import { getTransferWiseCurrencies, createTransferWiseQuote, getTransferWiseTransfers } from "./api/endpoints";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { ErrorView } from "./components";
import { getErrorMessage } from "./lib/errors";
import { DEFAULT_CURRENCY } from "./lib/constants";
import {
  ExchangeRatesView,
  AllCurrenciesView,
  QuoteCalculator,
  TransferHistoryList,
  TOP_CURRENCIES,
  sortCurrencies,
  type CurrencyInfo,
} from "./components/wise";

// ============== Main Component ==============

export default function WiseCommand() {
  const session = useBunqSession();
  const { push } = useNavigation();
  const [rates, setRates] = useState<Map<string, string | null>>(new Map());
  const [isLoadingRates, setIsLoadingRates] = useState(false);

  const {
    data: currencies,
    isLoading: isLoadingCurrencies,
    error: currenciesError,
    revalidate: revalidateCurrencies,
  } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return [];
      return withSessionRefresh(session, () => getTransferWiseCurrencies(session.userId!, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  const {
    data: transfers,
    isLoading: isLoadingTransfers,
    error: transfersError,
    revalidate: revalidateTransfers,
  } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return [];
      return withSessionRefresh(session, () => getTransferWiseTransfers(session.userId!, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  // Fetch exchange rates for displayed currencies
  useEffect(() => {
    if (!currencies || currencies.length === 0 || !session.userId) return;

    const fetchRates = async () => {
      setIsLoadingRates(true);
      const sorted = sortCurrencies(currencies as CurrencyInfo[]);
      const displayedCurrencies = sorted
        .filter((c) => TOP_CURRENCIES.includes(c.currency) && c.currency !== DEFAULT_CURRENCY)
        .slice(0, 8);

      const newRates = new Map<string, string | null>();

      // Fetch rates in parallel
      const results = await Promise.allSettled(
        displayedCurrencies.map(async (currency) => {
          try {
            const quote = await withSessionRefresh(session, () =>
              createTransferWiseQuote(
                session.userId!,
                {
                  currency_source: DEFAULT_CURRENCY,
                  currency_target: currency.currency,
                  amount_source: { value: "1", currency: DEFAULT_CURRENCY },
                },
                session.getRequestOptions(),
              ),
            );
            return { currency: currency.currency, rate: quote.rate || null };
          } catch {
            return { currency: currency.currency, rate: null };
          }
        }),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          newRates.set(result.value.currency, result.value.rate);
        }
      }

      setRates(newRates);
      setIsLoadingRates(false);
    };

    fetchRates();
  }, [currencies, session.userId]);

  if (session.isLoading) {
    return <List isLoading />;
  }

  if (session.error || currenciesError || transfersError) {
    return (
      <ErrorView
        title="Error Loading Transfers"
        message={getErrorMessage(session.error || currenciesError || transfersError)}
        onRetry={() => {
          revalidateCurrencies();
          revalidateTransfers();
        }}
        onRefreshSession={session.refresh}
      />
    );
  }

  const isLoading = isLoadingCurrencies || isLoadingTransfers;
  const currencyList = (currencies || []) as CurrencyInfo[];

  return (
    <List isLoading={isLoading} navigationTitle="International Transfers">
      <List.Section title="Actions">
        <List.Item
          title="Get Quote"
          subtitle="Calculate exchange rates"
          icon={{ source: Icon.Calculator, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Get Quote"
                icon={Icon.Calculator}
                onAction={() => push(<QuoteCalculator session={session} currencies={currencyList} />)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Live Exchange Rates"
          subtitle="View rates for major currencies"
          icon={{ source: Icon.LineChart, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action
                title="View Exchange Rates"
                icon={Icon.LineChart}
                onAction={() =>
                  push(
                    <ExchangeRatesView session={session} currencies={currencyList} baseCurrency={DEFAULT_CURRENCY} />,
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Transfer History"
          subtitle={`${transfers?.length || 0} transfers`}
          icon={{ source: Icon.Clock, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action
                title="View History"
                icon={Icon.List}
                onAction={() =>
                  push(
                    <TransferHistoryList
                      transfers={transfers || []}
                      isLoading={isLoadingTransfers}
                      onRefresh={revalidateTransfers}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={`Supported Currencies (${currencies?.length || 0})`}>
        {(() => {
          const sorted = sortCurrencies(currencyList);
          const topCurrenciesShown = sorted.filter((c) => TOP_CURRENCIES.includes(c.currency)).slice(0, 8);
          const remainingCount = (currencies?.length || 0) - topCurrenciesShown.length;

          return (
            <>
              {topCurrenciesShown.map((currency) => {
                const rate = rates.get(currency.currency);
                const rateAccessory = isLoadingRates
                  ? { icon: Icon.Clock, tooltip: "Loading rate..." }
                  : rate
                    ? {
                        text: `1 ${DEFAULT_CURRENCY} = ${rate}`,
                        tooltip: `Exchange rate: 1 ${DEFAULT_CURRENCY} = ${rate} ${currency.currency}`,
                      }
                    : rates.has(currency.currency)
                      ? { tag: { value: "N/A", color: Color.SecondaryText }, tooltip: "Rate unavailable" }
                      : undefined;

                return (
                  <List.Item
                    key={currency.currency}
                    title={currency.currency}
                    subtitle={currency.name ?? ""}
                    icon={{ source: Icon.Coins, tintColor: Color.Green }}
                    accessories={rateAccessory ? [rateAccessory] : []}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Get Quote"
                          icon={Icon.Calculator}
                          onAction={() =>
                            push(
                              <QuoteCalculator
                                session={session}
                                currencies={currencyList}
                                defaultTarget={currency.currency}
                              />,
                            )
                          }
                        />
                        {rate && (
                          <Action.CopyToClipboard
                            title="Copy Rate"
                            content={`1 ${DEFAULT_CURRENCY} = ${rate} ${currency.currency}`}
                          />
                        )}
                        <Action.CopyToClipboard title="Copy Currency Code" content={currency.currency} />
                      </ActionPanel>
                    }
                  />
                );
              })}
              {remainingCount > 0 && (
                <List.Item
                  title={`View All ${currencies?.length} Currencies`}
                  subtitle={`+${remainingCount} more`}
                  icon={{ source: Icon.List, tintColor: Color.Blue }}
                  actions={
                    <ActionPanel>
                      <Action
                        title="View All Currencies"
                        icon={Icon.List}
                        onAction={() => push(<AllCurrenciesView currencies={currencyList} session={session} />)}
                      />
                    </ActionPanel>
                  }
                />
              )}
            </>
          );
        })()}
      </List.Section>
    </List>
  );
}
