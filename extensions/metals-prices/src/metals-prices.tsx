import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { ensureHistoryWindow, loadMetalsData } from "./lib/data";
import { resolveApiKey, saveApiKey } from "./lib/apiKey";
import {
  DEFAULT_SELECTION_ID,
  METALS,
  Metal,
  MetalKey,
  Purity,
  parseSelection,
  pricePerGramForPurity,
  selectionId,
} from "./lib/metals";
import { DEFAULT_CURRENCY, formatAmount, formatCurrency, fractionDigitsFor } from "./lib/currency";

const WINDOW_LABEL: Record<number, string> = {
  30: "1 Month",
  90: "3 Months",
  180: "6 Months",
  365: "1 Year",
};

/** Tint each metal roughly the colour it actually is, so rows read at a glance. */
const METAL_COLOR: Record<MetalKey, Color> = {
  gold: Color.Yellow,
  silver: Color.SecondaryText,
  platinum: Color.Blue,
  palladium: Color.Purple,
};

/** Where the last metal + purity choice is remembered between launches. */
const SELECTION_STORAGE_KEY = "metals-prices-selection";

/** "1 request" / "3 requests" — for surfacing API-key spend to the user. */
function reqLabel(count: number): string {
  return `${count} request${count === 1 ? "" : "s"}`;
}

/** Descriptive clipboard text for the current price of a purity grade. */
function copyTextCurrent(metal: Metal, purity: Purity, perGram: number, currency: string, digits: number): string {
  return `${metal.label} price today (${purity.label}): ${formatAmount(perGram, digits)} ${currency} per gram`;
}

/** Descriptive clipboard text for a period average of a purity grade. */
function copyTextAverage(
  periodLabel: string,
  metal: Metal,
  purity: Purity,
  perGram: number,
  currency: string,
  digits: number,
): string {
  return `${metal.label} price ${periodLabel} average (${purity.label}): ${formatAmount(perGram, digits)} ${currency} per gram`;
}

function formatAsOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function MetalsPriceList({
  apiKey,
  selectionValue,
  onSelectionChange,
  onEditKey,
}: {
  apiKey: string;
  selectionValue: string;
  onSelectionChange: (value: string) => void;
  onEditKey: () => void;
}) {
  const currency = getPreferenceValues<Preferences>().currency || DEFAULT_CURRENCY;
  const { metal, purity } = parseSelection(selectionValue);

  // A hard refresh sets this flag so the next load bypasses the caches/TTLs.
  const forceRef = useRef(false);
  const { data, isLoading, error, revalidate } = usePromise(
    async (selectedCurrency: string) => {
      const force = forceRef.current;
      forceRef.current = false;
      return loadMetalsData(apiKey, selectedCurrency, force);
    },
    [currency],
    { failureToastOptions: { title: "Could not load metal prices" } },
  );

  const hardRefresh = () => {
    forceRef.current = true;
    revalidate();
  };

  // Load the older history for a longer averaging window (user-triggered, so it
  // fires the requests up front — the action title tells the user how many).
  const loadHistory = async (days: number, periodLabel: string, requests: number) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Loading ${periodLabel} history`,
      message: reqLabel(requests),
    });
    try {
      const made = await ensureHistoryWindow(apiKey, metal.key, days);
      await revalidate();
      toast.style = Toast.Style.Success;
      toast.title = `Loaded ${periodLabel} history`;
      toast.message = `${reqLabel(made)} used — covers every metal`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not load history";
      toast.message = (err as Error).message;
    }
  };

  const metalData = data?.metals[metal.key];
  const spot = metalData?.latestPerTroyOunce ?? null;
  // Precision is chosen from the metal's pure per-gram price and reused for every
  // figure in the view, so silver in a high-value currency (~0.4/g) and its
  // sub-cent daily move stay legible instead of rounding to "0.00".
  const digits = spot !== null ? fractionDigitsFor(pricePerGramForPurity(spot, metal.purities[0])) : 2;

  // The change is shown beside the pure-metal per-gram row, so compute it per
  // gram — not per troy ounce, which would overstate the daily move ~31x.
  const previousClose = metalData?.previousClosePerTroyOunce ?? null;
  const change =
    spot !== null && previousClose
      ? pricePerGramForPurity(spot, metal.purities[0]) - pricePerGramForPurity(previousClose, metal.purities[0])
      : null;
  const changePct =
    change !== null && previousClose ? (change / pricePerGramForPurity(previousClose, metal.purities[0])) * 100 : null;
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
          title="Could not load metal prices"
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
          tooltip="Metal and purity"
          value={selectionId(metal, purity)}
          onChange={onSelectionChange}
          storeValue={false}
        >
          {METALS.map((m) => (
            <List.Dropdown.Section key={m.key} title={m.label}>
              {m.purities.map((p) => (
                <List.Dropdown.Item key={selectionId(m, p)} title={`${m.label} ${p.label}`} value={selectionId(m, p)} />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      <List.Section
        title={`${metal.label} · per gram (${currency})`}
        subtitle={data ? `As of ${formatAsOf(data.asOf)}` : undefined}
      >
        {data && spot === null && (
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.SecondaryText }}
            title={`${metal.label} price unavailable`}
            subtitle="metals.dev did not return this metal — try a hard refresh"
            actions={<ActionPanel>{refreshActions}</ActionPanel>}
          />
        )}
        {data &&
          spot !== null &&
          metal.purities.map((p, index) => {
            const perGram = pricePerGramForPurity(spot, p);
            const accessories: List.Item.Accessory[] = [
              { tag: { value: formatCurrency(perGram, currency, digits), color: METAL_COLOR[metal.key] } },
            ];
            if (index === 0 && change !== null && changePct !== null) {
              accessories.unshift({
                icon: changeIcon ? { source: changeIcon, tintColor: changeColor } : undefined,
                text: {
                  value: `${change >= 0 ? "+" : ""}${formatCurrency(change, currency, digits)} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%)`,
                  color: changeColor,
                },
                tooltip: `Change vs. previous close (${p.label})`,
              });
            }
            return (
              <List.Item
                key={p.id}
                icon={{ source: Icon.Coins, tintColor: METAL_COLOR[metal.key] }}
                title={p.label}
                subtitle={p.note}
                accessories={accessories}
                actions={itemActions(`Copy ${p.label} Price`, copyTextCurrent(metal, p, perGram, currency, digits))}
              />
            );
          })}
      </List.Section>

      <List.Section
        title={`Averages · ${metal.label} ${purity.label} per gram (${currency})`}
        subtitle={data?.historyError ? "History unavailable — showing cached data" : "Based on daily closes"}
      >
        {metalData?.averages.map((avg) => {
          const periodLabel = WINDOW_LABEL[avg.days] ?? `${avg.days} Days`;

          // Not fully loaded: offer a "Load …" action that shows the request cost.
          if (avg.pendingRequests > 0) {
            return (
              <List.Item
                key={avg.days}
                icon={{ source: Icon.BarChart, tintColor: Color.SecondaryText }}
                title={periodLabel}
                subtitle="Not loaded — press to load"
                accessories={[{ tag: { value: "—", color: Color.SecondaryText } }]}
                actions={
                  <ActionPanel>
                    <Action
                      title={`Load ${periodLabel} History (${reqLabel(avg.pendingRequests)})`}
                      icon={Icon.Download}
                      onAction={() => loadHistory(avg.days, periodLabel, avg.pendingRequests)}
                    />
                    {refreshActions}
                  </ActionPanel>
                }
              />
            );
          }

          const perGram =
            avg.averagePerTroyOunce !== null ? pricePerGramForPurity(avg.averagePerTroyOunce, purity) : null;
          return (
            <List.Item
              key={avg.days}
              icon={{ source: Icon.BarChart, tintColor: Color.SecondaryText }}
              title={periodLabel}
              subtitle={
                avg.sampleCount > 0 ? `${avg.sampleCount} day${avg.sampleCount === 1 ? "" : "s"}` : "No data yet"
              }
              accessories={[
                {
                  tag: {
                    value: perGram !== null ? formatCurrency(perGram, currency, digits) : "—",
                    color: perGram !== null ? Color.Blue : Color.SecondaryText,
                  },
                },
              ]}
              actions={itemActions(
                "Copy Average",
                perGram === null ? null : copyTextAverage(periodLabel, metal, purity, perGram, currency, digits),
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
  // The remembered metal + purity. Rendering the dropdown before this resolves
  // would make Raycast select the first item and immediately overwrite the
  // stored choice, so the list waits for it.
  const {
    value: storedSelection,
    setValue: setStoredSelection,
    isLoading: isSelectionLoading,
  } = useLocalStorage<string>(SELECTION_STORAGE_KEY, DEFAULT_SELECTION_ID);

  useEffect(() => {
    resolveApiKey().then(setApiKey);
  }, []);

  if (apiKey === undefined || isSelectionLoading) {
    return <List isLoading />;
  }
  if (apiKey === null) {
    return <ApiKeyForm initialValue="" onSaved={setApiKey} />;
  }
  return (
    <MetalsPriceList
      apiKey={apiKey}
      selectionValue={storedSelection ?? DEFAULT_SELECTION_ID}
      onSelectionChange={setStoredSelection}
      onEditKey={() => setApiKey(null)}
    />
  );
}
