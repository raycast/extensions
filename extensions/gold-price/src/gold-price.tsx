import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { loadGoldData } from "./lib/data";
import { resolveApiKey, saveApiKey } from "./lib/apiKey";
import { KARATS, Karat, pricePerGramForKarat } from "./lib/gold";
import { DEFAULT_CURRENCY, formatCurrency } from "./lib/currency";

const WINDOW_LABEL: Record<number, string> = {
  30: "1 Month",
  90: "3 Months",
  180: "6 Months",
  365: "1 Year",
};

/** Plain 2-decimal number, e.g. "483.54". */
function formatPlain(value: number): string {
  return value.toFixed(2);
}

/** Descriptive clipboard text for the current price of a karat. */
function copyTextCurrent(karat: Karat, perGram: number, currency: string): string {
  return `Gold price today (${karat}K): ${formatPlain(perGram)} ${currency} per gram`;
}

/** Descriptive clipboard text for a period average of a karat. */
function copyTextAverage(periodLabel: string, karat: Karat, perGram: number, currency: string): string {
  return `Gold price ${periodLabel} average (${karat}K): ${formatPlain(perGram)} ${currency} per gram`;
}

function formatAsOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function GoldPriceList({ apiKey, onEditKey }: { apiKey: string; onEditKey: () => void }) {
  const currency = getPreferenceValues<Preferences>().currency || DEFAULT_CURRENCY;
  const [karat, setKarat] = useState<Karat>(24);

  // A hard refresh sets this flag so the next load bypasses the caches/TTLs.
  const forceRef = useRef(false);
  const { data, isLoading, error, revalidate } = usePromise(
    async (selectedCurrency: string) => {
      const force = forceRef.current;
      forceRef.current = false;
      return loadGoldData(apiKey, selectedCurrency, force);
    },
    [currency],
    { failureToastOptions: { title: "Could not load gold prices" } },
  );

  const hardRefresh = () => {
    forceRef.current = true;
    revalidate();
  };

  // The change is shown beside the 24K per-gram row, so compute it per gram (24K)
  // — not per troy ounce, which would overstate the daily move ~31x.
  const change =
    data && data.previousClosePerTroyOunce
      ? pricePerGramForKarat(data.latestPerTroyOunce, 24) - pricePerGramForKarat(data.previousClosePerTroyOunce, 24)
      : null;
  const changePct =
    change !== null && data?.previousClosePerTroyOunce
      ? (change / pricePerGramForKarat(data.previousClosePerTroyOunce, 24)) * 100
      : null;
  const changeIcon = change === null ? undefined : change >= 0 ? Icon.ArrowUp : Icon.ArrowDown;
  const changeColor = change === null ? undefined : change >= 0 ? Color.Green : Color.Red;

  // The refresh / preferences actions shared by every item. Two hard-refresh
  // entries register both ⌘R and ⌘↵ for the same live-fetch action.
  const refreshActions = (
    <>
      <Action
        title="Hard Refresh"
        icon={Icon.ArrowClockwise}
        onAction={hardRefresh}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <Action
        title="Hard Refresh (Live)"
        icon={Icon.ArrowClockwise}
        onAction={hardRefresh}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
      />
      <Action
        title="Set API Key"
        icon={Icon.Key}
        onAction={onEditKey}
        shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="Get / Manage API Key" url="https://metals.dev/pricing" />
    </>
  );

  // Per-item panel: Enter copies a descriptive line (when data is present),
  // then the shared refresh actions.
  const itemActions = (copyTitle: string, copyContent: string | null) => (
    <ActionPanel>
      {copyContent !== null && <Action.CopyToClipboard title={copyTitle} content={copyContent} />}
      {refreshActions}
    </ActionPanel>
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load gold prices"
          description={`${error.message}\n\nCheck your metals.dev API key in preferences, then refresh.`}
          actions={<ActionPanel>{refreshActions}</ActionPanel>}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Karat for averages"
          value={String(karat)}
          onChange={(v) => setKarat(Number(v) as Karat)}
        >
          {KARATS.map((k) => (
            <List.Dropdown.Item key={k} title={`${k}K`} value={String(k)} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section
        title={`Current Price · per gram (${currency})`}
        subtitle={data ? `As of ${formatAsOf(data.asOf)}` : undefined}
      >
        {data &&
          KARATS.map((k) => {
            const perGram = pricePerGramForKarat(data.latestPerTroyOunce, k);
            const accessories: List.Item.Accessory[] = [
              { tag: { value: formatCurrency(perGram, currency), color: Color.Yellow } },
            ];
            if (k === 24 && change !== null && changePct !== null) {
              accessories.unshift({
                icon: changeIcon ? { source: changeIcon, tintColor: changeColor } : undefined,
                text: {
                  value: `${change >= 0 ? "+" : ""}${formatCurrency(change, currency)} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%)`,
                  color: changeColor,
                },
                tooltip: "Change vs. previous close (24K)",
              });
            }
            return (
              <List.Item
                key={k}
                icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
                title={`${k}K`}
                subtitle={k === 24 ? "Pure gold" : `${k}/24 purity`}
                accessories={accessories}
                actions={itemActions(`Copy ${k}K Price`, copyTextCurrent(k, perGram, currency))}
              />
            );
          })}
      </List.Section>

      <List.Section
        title={`Averages · ${karat}K per gram (${currency})`}
        subtitle={data?.historyError ? "History unavailable — showing cached data" : "Based on daily closes"}
      >
        {data &&
          data.averages.map((avg) => {
            const perGram =
              avg.averagePerTroyOunce !== null ? pricePerGramForKarat(avg.averagePerTroyOunce, karat) : null;
            return (
              <List.Item
                key={avg.days}
                icon={{ source: Icon.BarChart, tintColor: Color.SecondaryText }}
                title={WINDOW_LABEL[avg.days] ?? `${avg.days} Days`}
                subtitle={
                  avg.sampleCount > 0 ? `${avg.sampleCount} day${avg.sampleCount === 1 ? "" : "s"}` : "No data yet"
                }
                accessories={[
                  {
                    tag: {
                      value: perGram !== null ? formatCurrency(perGram, currency) : "—",
                      color: perGram !== null ? Color.Blue : Color.SecondaryText,
                    },
                  },
                ]}
                actions={itemActions(
                  "Copy Average",
                  perGram === null
                    ? null
                    : copyTextAverage(WINDOW_LABEL[avg.days] ?? `${avg.days}-day`, karat, perGram, currency),
                )}
              />
            );
          })}
      </List.Section>
    </List>
  );
}

/**
 * In-app onboarding / re-entry form. Needed because the API key is an optional
 * preference (see `lib/apiKey.ts`): Raycast won't force the preference prompt,
 * so on first run — or after the Keychain-backed preference is lost — the user
 * enters the key here and we persist it to LocalStorage.
 */
function ApiKeyForm({ initialValue, onSaved }: { initialValue: string; onSaved: (key: string) => void }) {
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(values: { apiKey: string }) {
    const key = values.apiKey.trim();
    if (!key) {
      setError("API key is required");
      return;
    }
    await saveApiKey(key);
    onSaved(key);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save API Key" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Get an API Key" url="https://metals.dev/pricing" />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter your free metals.dev API key. It's stored securely on this device and reused automatically." />
      <Form.PasswordField
        id="apiKey"
        title="metals.dev API Key"
        placeholder="Paste your API key"
        defaultValue={initialValue}
        error={error}
        onChange={() => error && setError(undefined)}
      />
    </Form>
  );
}

export default function Command() {
  // `undefined` = still resolving; `null` = no key found anywhere (show form).
  const [apiKey, setApiKey] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    resolveApiKey().then(setApiKey);
  }, []);

  if (apiKey === undefined) {
    return <List isLoading />;
  }
  if (apiKey === null) {
    return <ApiKeyForm initialValue="" onSaved={setApiKey} />;
  }
  return <GoldPriceList apiKey={apiKey} onEditKey={() => setApiKey(null)} />;
}
