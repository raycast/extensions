/**
 * Currency conversion command using bunq's Wise integration.
 */

import { Action, ActionPanel, List, Icon, Form, useNavigation, showToast, Toast, Detail } from "@raycast/api";
import { useBunqSession, withSessionRefresh } from "./hooks/useBunqSession";
import { getTransferWiseCurrencies, createTransferWiseQuote, TransferWiseQuote } from "./api/endpoints";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { ErrorView } from "./components";
import { formatCurrency, formatDate } from "./lib/formatters";
import { getErrorMessage } from "./lib/errors";
import { DEFAULT_CURRENCY } from "./lib/constants";
import { requireUserId } from "./lib/session-guard";

// Popular currencies for quick access
const POPULAR_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "PLN", "SEK", "NOK", "DKK", "JPY", "AUD", "CAD"];

// ============== Quote Result ==============

function QuoteResult({
  quote,
  sourceCurrency,
  targetCurrency,
  sourceAmount,
}: {
  quote: TransferWiseQuote;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: string;
}) {
  const sourceFormatted = quote.amount_source
    ? formatCurrency(quote.amount_source.value, quote.amount_source.currency)
    : `${sourceCurrency} ${sourceAmount}`;
  const targetFormatted = quote.amount_target
    ? formatCurrency(quote.amount_target.value, quote.amount_target.currency)
    : "N/A";
  const rate = quote.rate || "N/A";

  const markdown = `# Currency Conversion

## ${sourceFormatted}

# =

## ${targetFormatted}

---

**Exchange Rate:** 1 ${sourceCurrency} = ${rate} ${targetCurrency}

${quote.time_expiry ? `*Rate valid until ${formatDate(quote.time_expiry)}*` : ""}

---

*Rates provided by Wise. To complete a transfer, use the International Transfers feature.*
`;

  return (
    <Detail
      navigationTitle="Conversion Result"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="From" text={sourceFormatted} />
          <Detail.Metadata.Label title="To" text={targetFormatted} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Rate" text={`1 ${sourceCurrency} = ${rate} ${targetCurrency}`} />
          <Detail.Metadata.Label
            title="Inverse"
            text={(() => {
              if (rate === "N/A") return "N/A";
              const rateNum = parseFloat(rate);
              if (!Number.isFinite(rateNum) || rateNum === 0) return "N/A";
              return `1 ${targetCurrency} = ${(1 / rateNum).toFixed(6)} ${sourceCurrency}`;
            })()}
          />
          {quote.time_expiry && <Detail.Metadata.Label title="Valid Until" text={formatDate(quote.time_expiry)} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={`${sourceFormatted} = ${targetFormatted}`} />
          <Action.CopyToClipboard title="Copy Rate" content={`1 ${sourceCurrency} = ${rate} ${targetCurrency}`} />
        </ActionPanel>
      }
    />
  );
}

// ============== Conversion Form ==============

function ConversionForm({
  session,
  currencies,
}: {
  session: ReturnType<typeof useBunqSession>;
  currencies: Array<{ currency: string; name?: string | undefined }>;
}) {
  const { push } = useNavigation();
  const [sourceCurrency, setSourceCurrency] = useState(DEFAULT_CURRENCY);
  const [targetCurrency, setTargetCurrency] = useState("USD");
  const [amount, setAmount] = useState("100");
  const [isConverting, setIsConverting] = useState(false);

  // Sort currencies with popular ones first
  const sortedCurrencies = [...currencies].sort((a, b) => {
    const aPopular = POPULAR_CURRENCIES.indexOf(a.currency);
    const bPopular = POPULAR_CURRENCIES.indexOf(b.currency);
    if (aPopular !== -1 && bPopular === -1) return -1;
    if (aPopular === -1 && bPopular !== -1) return 1;
    if (aPopular !== -1 && bPopular !== -1) return aPopular - bPopular;
    return a.currency.localeCompare(b.currency);
  });

  const handleConvert = async () => {
    const parsed = Number(amount?.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter a valid amount" });
      return;
    }

    if (sourceCurrency === targetCurrency) {
      await showToast({ style: Toast.Style.Failure, title: "Please select different currencies" });
      return;
    }

    setIsConverting(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Getting exchange rate..." });

      const userId = requireUserId(session);
      const quote = await withSessionRefresh(session, () =>
        createTransferWiseQuote(
          userId,
          {
            currency_source: sourceCurrency,
            currency_target: targetCurrency,
            amount_source: { value: amount, currency: sourceCurrency },
          },
          session.getRequestOptions(),
        ),
      );

      await showToast({ style: Toast.Style.Success, title: "Rate calculated" });
      push(
        <QuoteResult
          quote={quote}
          sourceCurrency={sourceCurrency}
          targetCurrency={targetCurrency}
          sourceAmount={amount}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to get exchange rate",
        message: getErrorMessage(error),
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleSwapCurrencies = () => {
    const temp = sourceCurrency;
    setSourceCurrency(targetCurrency);
    setTargetCurrency(temp);
  };

  return (
    <Form
      isLoading={isConverting}
      navigationTitle="Currency Converter"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" icon={Icon.ArrowRight} onSubmit={handleConvert} />
          <Action
            title="Swap Currencies"
            icon={Icon.Switch}
            onAction={handleSwapCurrencies}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="amount" title="Amount" placeholder="100" value={amount} onChange={setAmount} />
      <Form.Dropdown id="sourceCurrency" title="From" value={sourceCurrency} onChange={setSourceCurrency}>
        <Form.Dropdown.Section title="Popular">
          {sortedCurrencies
            .filter((c) => POPULAR_CURRENCIES.includes(c.currency))
            .map((c) => (
              <Form.Dropdown.Item
                key={c.currency}
                value={c.currency}
                title={`${c.currency}${c.name ? ` - ${c.name}` : ""}`}
              />
            ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="All Currencies">
          {sortedCurrencies
            .filter((c) => !POPULAR_CURRENCIES.includes(c.currency))
            .map((c) => (
              <Form.Dropdown.Item
                key={c.currency}
                value={c.currency}
                title={`${c.currency}${c.name ? ` - ${c.name}` : ""}`}
              />
            ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Dropdown id="targetCurrency" title="To" value={targetCurrency} onChange={setTargetCurrency}>
        <Form.Dropdown.Section title="Popular">
          {sortedCurrencies
            .filter((c) => POPULAR_CURRENCIES.includes(c.currency))
            .map((c) => (
              <Form.Dropdown.Item
                key={c.currency}
                value={c.currency}
                title={`${c.currency}${c.name ? ` - ${c.name}` : ""}`}
              />
            ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="All Currencies">
          {sortedCurrencies
            .filter((c) => !POPULAR_CURRENCIES.includes(c.currency))
            .map((c) => (
              <Form.Dropdown.Item
                key={c.currency}
                value={c.currency}
                title={`${c.currency}${c.name ? ` - ${c.name}` : ""}`}
              />
            ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Description text="Exchange rates provided by Wise" />
    </Form>
  );
}

// ============== Main Component ==============

export default function CurrencyCommand() {
  const session = useBunqSession();

  const {
    data: currencies,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return [];
      const userId = requireUserId(session);
      return withSessionRefresh(session, () => getTransferWiseCurrencies(userId, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  if (session.isLoading || isLoading) {
    return <List isLoading />;
  }

  if (session.error || error) {
    return (
      <ErrorView
        title="Error Loading Currencies"
        message={getErrorMessage(session.error || error)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  // If we have currencies, go directly to the conversion form
  if (currencies && currencies.length > 0) {
    return <ConversionForm session={session} currencies={currencies} />;
  }

  return (
    <List>
      <List.EmptyView
        icon={Icon.Coins}
        title="No Currencies Available"
        description="Unable to load currency list"
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    </List>
  );
}
