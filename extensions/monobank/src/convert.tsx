import { Action, ActionPanel, Icon, LaunchProps, List, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "./data/constants";
import { shortcuts } from "./data/shortcuts";
import { loadRates } from "./services/rates";
import { readJson } from "./services/storage";
import { Currency, CurrencyRate } from "./types";
import {
  ConversionStep,
  convertAmount,
  costOf,
  formatAmount,
  formatPlainAmount,
  formatUpdatedAt,
  getFlagImage,
  parseConvertQuery,
} from "./utils";

/** The rates (5 minutes fresh, and saved to the rate history when fetched) and the rates pinned in "Show Currency Rates". */
async function loadConvertRates() {
  const [loaded, pinnedIds] = await Promise.all([loadRates(), readJson<string[]>(STORAGE_KEYS.pinnedRates)]);
  return { ...loaded, pinnedIds: pinnedIds ?? [] };
}

/** The arguments as one query, e.g. "100 usd eur". Without `from`, `to` would be read as `from`, so USD is added. */
function getInitialSearchText(args: Arguments.Convert) {
  const amount = args.amount?.trim() ?? "";
  const from = args.from?.trim() ?? "";
  const to = args.to?.trim() ?? "";
  const needsFrom = !!to && !from && !parseConvertQuery(amount).from;

  return [amount, needsFrom ? "USD" : from, to].filter(Boolean).join(" ");
}

function getCurrencies(rates: CurrencyRate[]) {
  const currencies = new Map<string, Currency>();
  for (const rate of rates) {
    currencies.set(rate.currencyA.code, rate.currencyA);
    currencies.set(rate.currencyB.code, rate.currencyB);
  }
  return currencies;
}

/** Every currency but `from`: UAH, the currencies of pinned rates, USD, EUR, then the rest. */
function getTargetCodes(currencies: Map<string, Currency>, rates: CurrencyRate[], pinnedIds: string[], from: string) {
  const pinnedCodes = pinnedIds.flatMap((id) => {
    const rate = rates.find((rate) => rate.id === id);
    return rate ? [rate.currencyA.code, rate.currencyB.code] : [];
  });
  const ordered = new Set(["UAH", ...pinnedCodes, "USD", "EUR", ...currencies.keys()]);
  return [...ordered].filter((code) => code !== from && currencies.has(code));
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Convert }>) {
  const [searchText, setSearchText] = useState(() => getInitialSearchText(props.arguments));
  const { data, isLoading, error } = useCachedPromise(loadConvertRates);

  useEffect(() => {
    if (data?.stale) {
      showToast({
        style: Toast.Style.Failure,
        title: "monobank unreachable",
        message: `Rates from ${formatUpdatedAt(data.updatedAt)}`,
      });
    }
  }, [data?.stale, data?.updatedAt]);

  const rates = data?.rates ?? [];
  const currencies = useMemo(() => getCurrencies(rates), [rates]);

  const query = parseConvertQuery(searchText);
  const { amount } = query;
  const fromCode = query.from ?? "USD";
  const toCode = query.to;

  function renderContent() {
    if (!searchText.trim()) {
      return (
        <List.EmptyView
          icon={Icon.Coins}
          title="Enter an amount"
          description="E.g. 100 usd, $100, 250 eur pln or 1000 грн"
        />
      );
    }

    if (amount === undefined) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Invalid amount"
          description="Enter a positive number and currencies, e.g. 100 usd or 250 eur to pln"
        />
      );
    }

    if (!data) {
      return error ? (
        <List.EmptyView icon={Icon.WifiDisabled} title="Couldn't load rates" description="monobank is unreachable" />
      ) : null;
    }

    const unknown = [fromCode, toCode].find((code) => code !== undefined && !currencies.has(code));
    if (unknown) {
      return (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title={`Unknown currency ${unknown}`}
          description="monobank has no rate for it. Use a code like USD, EUR or PLN"
        />
      );
    }

    const from = currencies.get(fromCode)!;

    if (toCode) {
      const to = currencies.get(toCode)!;
      const converted = convertAmount(rates, amount, fromCode, toCode);
      if (!converted) {
        return <List.EmptyView icon={Icon.QuestionMark} title={`No rate for ${fromCode} → ${toCode}`} />;
      }

      return (
        <ResultItem
          icon={getFlagImage(toCode)}
          title={`${formatAmount(amount, from)} → ${formatAmount(converted.result, to)}`}
          value={converted.result}
          currency={to}
          steps={converted.steps}
        />
      );
    }

    const targets = getTargetCodes(currencies, rates, data.pinnedIds, fromCode).flatMap((code) => {
      const to = currencies.get(code)!;
      const converted = convertAmount(rates, amount, fromCode, code);
      return converted ? [{ to, ...converted }] : [];
    });

    const renderTarget = ({ to, result, steps }: (typeof targets)[number]) => (
      <ResultItem
        key={to.code}
        icon={getFlagImage(to.code)}
        title={`${formatAmount(amount, from)} → ${formatAmount(result, to)}`}
        value={result}
        currency={to}
        steps={steps}
      />
    );

    // UAH buys foreign currencies, so there's nothing to sell.
    if (fromCode === "UAH") {
      return <List.Section title={`Exchange ${formatAmount(amount, from)}`}>{targets.map(renderTarget)}</List.Section>;
    }

    const uah = currencies.get("UAH");
    const cost = uah && costOf(rates, amount, fromCode, "UAH");

    return (
      <>
        <List.Section title={`Sell ${formatAmount(amount, from)}`}>{targets.map(renderTarget)}</List.Section>
        {uah && cost && (
          <List.Section title={`Buy ${formatAmount(amount, from)}`}>
            <ResultItem
              icon={getFlagImage(fromCode)}
              title={`${formatAmount(cost.result, uah)} → ${formatAmount(amount, from)}`}
              value={cost.result}
              currency={uah}
              steps={cost.steps}
            />
          </List.Section>
        )}
      </>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarPlaceholder="Amount and currencies, e.g. 100 usd or 250 eur to pln"
    >
      {renderContent()}
    </List>
  );
}

/** A conversion result. `value` in `currency` is what the copy and paste actions use. */
function ResultItem(props: {
  icon: string;
  title: string;
  value: number;
  currency: Currency;
  steps: ConversionStep[];
}) {
  const { icon, title, value, currency, steps } = props;
  const plain = formatPlainAmount(value, currency);
  const formatted = formatAmount(value, currency);
  // A single rate can be copied. Two steps through UAH have no one rate to copy.
  const singleRate = steps.length === 1 ? steps[0].conversion.rate : undefined;

  const accessories: List.Item.Accessory[] = steps.length
    ? [
        {
          text: steps.map(({ conversion }) => `${conversion.rateType} ${conversion.rate}`).join(" · "),
          tooltip:
            steps
              .map(({ rate, conversion }) => `1 ${rate.currencyA.code} = ${conversion.rate} ${rate.currencyB.code}`)
              .join(", ") + (steps.length > 1 ? " (via UAH)" : ""),
        },
      ]
    : [];

  return (
    <List.Item
      icon={icon}
      title={title}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={plain} />
          <Action.Paste title="Paste Result" content={plain} />
          <Action.CopyToClipboard title="Copy Amount with Currency" content={formatted} />
          {singleRate !== undefined && (
            <Action.CopyToClipboard title="Copy Rate" content={singleRate} shortcut={shortcuts.copyRate} />
          )}
        </ActionPanel>
      }
    />
  );
}
