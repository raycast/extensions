import { Action, ActionPanel, Color, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { CURRENCIES, formatAmount, getCurrency } from "./currencies";
import { formatRelativeTime, getPrefs, getRates, InvalidApiKeyError, MissingApiKeyError } from "./api";
import NoApiKey from "./NoApiKey";

const FAVORITES_KEY = "favorites";
const FROM_KEY = "lastFrom";

function parseAmount(input: string): number | null {
  if (!input.trim()) return null;
  const normalized = input.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export default function ConvertCommand() {
  const prefs = getPrefs();
  const [searchText, setSearchText] = useState<string>("1");
  const [from, setFrom] = useState<string>(prefs.defaultFrom);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [fetchedAt, setFetchedAt] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const [favorites, setFavorites] = useState<string[]>([prefs.defaultTo]);
  const [keyState, setKeyState] = useState<"ok" | "missing" | "invalid">("ok");

  // Load persisted state
  useEffect(() => {
    void (async () => {
      const savedFrom = await LocalStorage.getItem<string>(FROM_KEY);
      if (savedFrom) setFrom(savedFrom);
      const savedFavs = await LocalStorage.getItem<string>(FAVORITES_KEY);
      if (savedFavs) {
        try {
          const parsed = JSON.parse(savedFavs) as string[];
          if (Array.isArray(parsed) && parsed.length) setFavorites(parsed);
        } catch {
          // ignore
        }
      }
    })();
  }, []);

  async function loadRates(base: string, force = false) {
    setLoading(true);
    try {
      const data = await getRates(base);
      setRates(data.rates);
      setFetchedAt(data.fetchedAt);
      setError(undefined);
      setKeyState("ok");
      if (force) await showToast({ style: Toast.Style.Success, title: "Rates refreshed" });
    } catch (e) {
      if (e instanceof MissingApiKeyError) {
        setKeyState("missing");
        return;
      }
      if (e instanceof InvalidApiKeyError) {
        setKeyState("invalid");
        return;
      }
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      await showToast({ style: Toast.Style.Failure, title: "Failed to load rates", message: msg });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRates(from);
    void LocalStorage.setItem(FROM_KEY, from);
  }, [from]);

  async function toggleFavorite(code: string) {
    const next = favorites.includes(code) ? favorites.filter((c) => c !== code) : [...favorites, code];
    setFavorites(next);
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    await showToast({
      style: Toast.Style.Success,
      title: favorites.includes(code) ? `${code} removed from favorites` : `${code} added to favorites`,
    });
  }

  const amount = parseAmount(searchText);
  const fromCurrency = getCurrency(from);

  const items = useMemo(() => {
    return CURRENCIES.filter((c) => c.code !== from).map((c) => {
      const rate = rates[c.code];
      const value = amount !== null && rate ? amount * rate : null;
      return {
        currency: c,
        rate,
        value,
        isFavorite: favorites.includes(c.code),
      };
    });
  }, [from, rates, amount, favorites]);

  const favoriteItems = items.filter((i) => i.isFavorite);
  const otherItems = items.filter((i) => !i.isFavorite);

  if (keyState !== "ok") {
    return <NoApiKey invalid={keyState === "invalid"} />;
  }

  const headerSubtitle = error
    ? `⚠ ${error}`
    : amount === null
      ? "Type an amount above"
      : fetchedAt
        ? `Updated ${formatRelativeTime(fetchedAt)}`
        : "Loading rates…";

  return (
    <List
      isLoading={loading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Type amount in ${from}…`}
      navigationTitle={`Convert from ${from}`}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="From currency" value={from} onChange={setFrom} storeValue>
          <List.Dropdown.Section title="From">
            {CURRENCIES.map((c) => (
              <List.Dropdown.Item key={c.code} value={c.code} title={`${c.flag}  ${c.code} — ${c.name}`} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={`${fromCurrency?.flag ?? ""} ${amount ?? "—"} ${from}`} subtitle={headerSubtitle}>
        {/* Visual header — empty section for context */}
      </List.Section>

      {favoriteItems.length > 0 && (
        <List.Section title="Favorites" subtitle={`${favoriteItems.length}`}>
          {favoriteItems.map((item) => (
            <ConversionItem
              key={item.currency.code}
              from={from}
              amount={amount}
              currency={item.currency}
              rate={item.rate}
              value={item.value}
              isFavorite={item.isFavorite}
              onToggleFavorite={toggleFavorite}
              onRefresh={() => loadRates(from, true)}
            />
          ))}
        </List.Section>
      )}

      <List.Section title="All currencies" subtitle={`${otherItems.length}`}>
        {otherItems.map((item) => (
          <ConversionItem
            key={item.currency.code}
            from={from}
            amount={amount}
            currency={item.currency}
            rate={item.rate}
            value={item.value}
            isFavorite={item.isFavorite}
            onToggleFavorite={toggleFavorite}
            onRefresh={() => loadRates(from, true)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ConversionItem({
  from,
  amount,
  currency,
  rate,
  value,
  isFavorite,
  onToggleFavorite,
  onRefresh,
}: {
  from: string;
  amount: number | null;
  currency: { code: string; name: string; flag: string; symbol: string };
  rate: number | undefined;
  value: number | null;
  isFavorite: boolean;
  onToggleFavorite: (code: string) => void;
  onRefresh: () => void;
}) {
  const valueText = value !== null ? formatAmount(value, currency.code) : rate ? "—" : "…";
  const rateText = rate ? `1 ${from} = ${rate.toFixed(4)}` : "no rate";
  const copyValue = value !== null ? value.toFixed(2) : "";
  const copyFull = value !== null && amount !== null ? `${amount} ${from} = ${value.toFixed(2)} ${currency.code}` : "";

  return (
    <List.Item
      icon={{
        source: isFavorite ? Icon.Star : Icon.Circle,
        tintColor: isFavorite ? Color.Yellow : Color.SecondaryText,
      }}
      title={`${currency.flag}  ${currency.code}`}
      subtitle={currency.name}
      accessories={[{ tag: { value: valueText, color: Color.Green } }, { text: rateText }]}
      keywords={[currency.code, currency.name]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {copyValue && <Action.CopyToClipboard title="Copy Converted Value" content={copyValue} />}
            {copyFull && (
              <Action.CopyToClipboard
                title="Copy Full Result"
                content={copyFull}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              onAction={() => onToggleFavorite(currency.code)}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action
              title="Refresh Rates"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
