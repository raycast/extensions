/**
 * Exchange rates view component for displaying currency rates.
 */

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { createTransferWiseQuote } from "../../api/endpoints";
import { TOP_CURRENCIES, type CurrencyInfo } from "./wise-helpers";
import { requireUserId } from "../../lib/session-guard";

interface ExchangeRate {
  currency: string;
  name?: string | undefined;
  rate?: string | undefined;
  isLoading?: boolean | undefined;
  error?: boolean | undefined;
}

interface ExchangeRatesViewProps {
  session: ReturnType<typeof useBunqSession>;
  currencies: CurrencyInfo[];
  baseCurrency: string;
}

export function ExchangeRatesView({ session, currencies, baseCurrency }: ExchangeRatesViewProps) {
  const [rates, setRates] = useState<Map<string, ExchangeRate>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch rates for top currencies on mount
  useEffect(() => {
    const fetchRates = async () => {
      const targetCurrencies = TOP_CURRENCIES.filter((c) => c !== baseCurrency).slice(0, 10);
      const initialRates = new Map<string, ExchangeRate>();

      // Initialize with loading state
      for (const currency of targetCurrencies) {
        const currencyData = currencies.find((c) => c.currency === currency);
        initialRates.set(currency, {
          currency,
          name: currencyData?.name,
          isLoading: true,
        });
      }
      setRates(initialRates);

      // Fetch rates in parallel (with some concurrency limit)
      const userId = requireUserId(session);
      const results = await Promise.allSettled(
        targetCurrencies.map(async (targetCurrency) => {
          try {
            const quote = await withSessionRefresh(session, () =>
              createTransferWiseQuote(
                userId,
                {
                  currency_source: baseCurrency,
                  currency_target: targetCurrency,
                  amount_source: { value: "1", currency: baseCurrency },
                },
                session.getRequestOptions(),
              ),
            );
            return { currency: targetCurrency, rate: quote.rate };
          } catch {
            return { currency: targetCurrency, error: true };
          }
        }),
      );

      // Update rates with results
      const updatedRates = new Map<string, ExchangeRate>();
      for (const result of results) {
        if (result.status === "fulfilled") {
          const { currency, rate, error } = result.value as { currency: string; rate?: string; error?: boolean };
          const currencyData = currencies.find((c) => c.currency === currency);
          updatedRates.set(currency, {
            currency,
            name: currencyData?.name,
            rate,
            error,
            isLoading: false,
          });
        }
      }
      setRates(updatedRates);
      setIsLoading(false);
    };

    fetchRates();
  }, [session, baseCurrency, currencies]);

  const ratesList = Array.from(rates.values());

  return (
    <List isLoading={isLoading} navigationTitle={`Exchange Rates (1 ${baseCurrency})`}>
      <List.Section title={`Rates from ${baseCurrency}`}>
        {ratesList.map((rate) => (
          <List.Item
            key={rate.currency}
            title={rate.currency}
            subtitle={rate.name ?? ""}
            icon={{ source: Icon.Coins, tintColor: rate.error ? Color.Red : Color.Green }}
            accessories={[
              rate.isLoading
                ? { icon: Icon.Clock, tooltip: "Loading..." }
                : rate.error
                  ? { tag: { value: "Error", color: Color.Red } }
                  : rate.rate
                    ? { text: `${rate.rate}`, tooltip: `1 ${baseCurrency} = ${rate.rate} ${rate.currency}` }
                    : { text: "N/A" },
            ]}
            actions={
              <ActionPanel>
                {rate.rate && (
                  <Action.CopyToClipboard
                    title="Copy Rate"
                    content={`1 ${baseCurrency} = ${rate.rate} ${rate.currency}`}
                  />
                )}
                <Action.CopyToClipboard title="Copy Currency Code" content={rate.currency} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Note">
        <List.Item
          title="Rates are indicative"
          subtitle="Final rates may vary at time of transfer"
          icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
        />
      </List.Section>
    </List>
  );
}
