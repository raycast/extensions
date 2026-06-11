import {
  List,
  ActionPanel,
  Action,
  showHUD,
  Clipboard,
  Color,
  Icon,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

const API_URL = "https://mindicador.cl/api";

interface IndicatorData {
  valor: number;
  fecha: string;
}

interface MindicadorResponse {
  dolar: IndicatorData;
  uf: IndicatorData;
  euro: IndicatorData;
  utm: IndicatorData;
}

const INDICATORS = [
  {
    id: "dolar",
    title: "Dólar",
    color: Color.Green,
    keywords: ["dollar", "usd"],
    decimals: 2,
  },
  { id: "uf", title: "UF", color: Color.Blue, keywords: [], decimals: 4 },
  {
    id: "euro",
    title: "Euro",
    color: Color.Purple,
    keywords: ["eur"],
    decimals: 2,
  },
  { id: "utm", title: "UTM", color: Color.Orange, keywords: [], decimals: 4 },
] as const;

type CurrencyId = (typeof INDICATORS)[number]["id"];

const CURRENCY_MAP = Object.fromEntries(
  INDICATORS.map((i) => [i.id, i]),
) as Record<CurrencyId, (typeof INDICATORS)[number]>;

const CURRENCY_ALIASES: Record<string, CurrencyId> = Object.fromEntries([
  ...INDICATORS.flatMap((i) =>
    [i.id, ...i.keywords].map((alias) => [alias, i.id]),
  ),
]);

function formatCLP(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseConversion(
  text: string,
): { amount: number; currency: CurrencyId | null } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([\d.,]+)\s+(\S+)(?:\s+to\s+clp)?$/i);
  if (match) {
    const amount = parseFloat(match[1].replace(/,/g, ""));
    const currencyKey = CURRENCY_ALIASES[match[2].toLowerCase()];
    if (!isNaN(amount) && currencyKey) {
      return { amount, currency: currencyKey };
    }
  }

  const amount = parseFloat(trimmed.replace(/,/g, ""));
  if (!isNaN(amount)) {
    return { amount, currency: null };
  }

  return null;
}

function getConversions(
  data: MindicadorResponse,
  amount: number,
  currency: CurrencyId | null,
) {
  if (currency) {
    const rate = data[currency].valor;
    const info = CURRENCY_MAP[currency];
    const clpValue = amount * rate;
    return [
      {
        id: `${currency}-to-clp`,
        title: `${amount} ${info.title} = $${formatCLP(clpValue)} CLP`,
        subtitle: `1 ${info.title} = $${formatCLP(rate)} CLP`,
        value: formatCLP(clpValue),
        rawValue: clpValue,
        color: info.color,
      },
    ];
  }

  return INDICATORS.map((indicator) => {
    const rate = data[indicator.id].valor;
    const converted = amount / rate;
    const formattedValue = converted.toLocaleString("en-US", {
      minimumFractionDigits: indicator.decimals,
      maximumFractionDigits: indicator.decimals,
    });
    return {
      id: `clp-to-${indicator.id}`,
      title: `$${formatCLP(amount)} CLP = ${formattedValue} ${indicator.title}`,
      subtitle: `1 ${indicator.title} = $${formatCLP(rate)} CLP`,
      value: formattedValue,
      rawValue: converted,
      color: indicator.color,
    };
  });
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, error, revalidate } =
    useFetch<MindicadorResponse>(API_URL);

  const conversion = parseConversion(searchText);
  const conversionResults =
    data && conversion
      ? getConversions(data, conversion.amount, conversion.currency)
      : [];

  const filteredIndicators =
    !conversion && data
      ? INDICATORS.filter((item) => {
          if (!searchText.trim()) return true;
          const query = normalize(searchText.trim());
          return (
            normalize(item.title).includes(query) ||
            item.keywords.some((kw) => normalize(kw).includes(query))
          );
        }).map((item) => ({
          ...item,
          value: data[item.id].valor,
          date: data[item.id].fecha,
        }))
      : [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search or convert, e.g. 35 UF or 50000"
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could not load indicators"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : conversion ? (
        conversionResults.map((item) => (
          <List.Item
            key={item.id}
            icon={{ source: Icon.Calculator, tintColor: item.color }}
            title={item.title}
            subtitle={item.subtitle}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Result"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy(item.value);
                    await showHUD(`Copied: ${item.value}`);
                  }}
                />
                <Action
                  title="Copy Raw Value"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={async () => {
                    await Clipboard.copy(String(item.rawValue));
                    await showHUD(`Copied: ${item.rawValue}`);
                  }}
                />
                <Action
                  title="Refresh Rates"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        filteredIndicators.map((item) => (
          <List.Item
            key={item.id}
            icon={{ source: Icon.BankNote, tintColor: item.color }}
            title={item.title}
            subtitle={`Updated: ${formatDate(item.date)}`}
            accessories={[{ text: `$${formatCLP(item.value)}` }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Value"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy(String(item.value));
                    await showHUD(
                      `${item.title} copied: $${formatCLP(item.value)}`,
                    );
                  }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
